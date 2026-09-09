"""Bounded, observable, adaptive Socrata JSON ingestion."""
from dataclasses import dataclass
import hashlib
import json
import time
import random
import requests

from .config import PageSizeConfig


class SocrataError(RuntimeError):
    def __init__(self, message, reason="source_failure"):
        super().__init__(message)
        self.reason = reason


@dataclass(frozen=True)
class AdaptivePageSizer:
    minimum: int
    maximum: int
    target_seconds: float = 12.0

    def __post_init__(self):
        if not (0 < self.minimum <= self.maximum):
            raise ValueError("invalid adaptive page-size bounds")
        if self.target_seconds <= 0:
            raise ValueError("target_seconds must be positive")

    def on_success(self, page_size, duration_seconds, row_count):
        if duration_seconds >= self.target_seconds * 1.25:
            selected = int(page_size * 0.7)
        elif row_count == page_size and duration_seconds <= self.target_seconds * 0.5:
            selected = int(page_size * 1.25)
        else:
            selected = page_size
        return min(self.maximum, max(self.minimum, selected))

    def on_timeout(self, page_size):
        return min(self.maximum, max(self.minimum, page_size // 2))


class SocrataClient:
    def __init__(self, token=None, timeout=75, retries=6, max_dataset_seconds=1200,
                 max_rows=2_000_000, session=None, log=print, sleep=time.sleep,
                 clock=time.monotonic, connect_timeout=10, random_fn=random.random):
        self.timeout = timeout
        self.connect_timeout = connect_timeout
        self.retries = retries
        self.max_dataset_seconds = max_dataset_seconds
        self.max_rows = max_rows
        self.session = session or requests.Session()
        self.headers = {"X-App-Token": token} if token else {}
        self.log, self.sleep, self.clock = log, sleep, clock
        self.random_fn = random_fn
        self.last_stats = None

    def _event(self, event, **details):
        if self.log:
            self.log(json.dumps({"event": event, **details}, sort_keys=True), flush=True)

    def _remaining(self, started):
        return self.max_dataset_seconds - (self.clock() - started)

    def _fail_deadline(self, dataset_id, total):
        raise SocrataError(
            f"{dataset_id}: source deadline exceeded after {self.max_dataset_seconds}s and {total} rows",
            "source_deadline_exceeded",
        )

    @staticmethod
    def _signature(payload):
        return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()

    @staticmethod
    def _validate_page(dataset_id, payload, requested, order_fields, primary_key):
        if not isinstance(payload, list):
            raise SocrataError(f"{dataset_id}: expected row array, got {type(payload).__name__}", "malformed_schema")
        if len(payload) > requested:
            raise SocrataError(f"{dataset_id}: response returned {len(payload)} rows for limit {requested}", "malformed_schema")
        if any(not isinstance(row, dict) for row in payload):
            raise SocrataError(f"{dataset_id}: response contains non-object row", "malformed_schema")
        keys, ordering = [], []
        for row in payload:
            if not row.get(primary_key):
                raise SocrataError(f"{dataset_id}: row missing primary key {primary_key}", "malformed_schema")
            keys.append(str(row[primary_key]))
            # Socrata omits null properties from JSON and sorts nulls after values
            # for these ascending queries. Preserve that explicit bucket so the
            # unique tie-breaker still makes null-timestamp rows deterministic.
            ordering.append(tuple((1, "") if row.get(field) is None else (0, str(row[field]))
                                  for field in order_fields))
        if len(keys) != len(set(keys)):
            raise SocrataError(f"{dataset_id}: duplicate primary keys within page", "duplicate_primary_key")
        if ordering != sorted(ordering):
            raise SocrataError(f"{dataset_id}: ordering regression within page", "ordering_regression")
        return keys, ordering

    def rows(self, dataset_id, order="updateddate,globalid", limit=None, page_size=None,
             where=None, dataset_name=None, primary_key="globalid", max_pages=None,
             max_probe_rows=None, pagination_strategy="offset", cursor=None):
        config = page_size or PageSizeConfig(initial=limit or 10_000, minimum=limit or 10_000, maximum=limit or 10_000)
        if limit is not None and page_size is not None:
            raise ValueError("use either limit or page_size, not both")
        order_fields = tuple(part.strip().split()[0] for part in order.split(",") if part.strip())
        if len(order_fields) < 2 or order_fields[-1] != primary_key:
            raise ValueError("Socrata order must end with the unique primary-key tie-breaker")
        sizer = AdaptivePageSizer(config.minimum, config.maximum, config.target_seconds)
        name = dataset_name or dataset_id
        current_size = config.initial
        if pagination_strategy not in ("offset", "keyset"):
            raise ValueError("pagination_strategy must be offset or keyset")
        if pagination_strategy == "keyset" and tuple(order_fields) != order_fields:
            raise ValueError("invalid keyset ordering")
        offset = total = pages = retry_count = timeout_count = 0
        durations, seen_pages, seen_keys = [], set(), set()
        last_order = None
        started = self.clock()
        self._event("dataset_started", source=name, dataset_id=dataset_id,
                    pagination_strategy=pagination_strategy, initial_page_size=current_size,
                    minimum_page_size=config.minimum, maximum_page_size=config.maximum,
                    order_fields=list(order_fields))
        while True:
            if max_pages is not None and pages >= max_pages:
                break
            if max_probe_rows is not None and total >= max_probe_rows:
                break
            if self._remaining(started) <= 1:
                self._fail_deadline(dataset_id, total)
            requested = current_size
            if max_probe_rows is not None:
                requested = min(requested, max_probe_rows - total)
            response = payload = None
            page_retries = 0
            for attempt in range(1, self.retries + 1):
                remaining = self._remaining(started)
                if remaining <= 1:
                    self._fail_deadline(dataset_id, total)
                params = {"$limit": requested, "$order": order}
                if pagination_strategy == "offset":
                    params["$offset"] = offset
                elif cursor is not None:
                    # SoQL values are quoted/escaped as literals; the API receives
                    # them through requests' parameter encoding, never URL text.
                    stamp, key = cursor
                    stamp = str(stamp).replace("'", "''")
                    key = str(key).replace("'", "''")
                    params["$where"] = f"({order_fields[0]} > '{stamp}' OR ({order_fields[0]} = '{stamp}' AND {primary_key} > '{key}'))"
                if where:
                    params["$where"] = where if "$where" not in params else f"({where}) AND ({params['$where']})"
                self._event("request_started", source=name, page=pages + 1, offset=offset,
                            requested_page_size=requested, rows_fetched=total, attempt=attempt,
                            cursor=cursor, pagination_strategy=pagination_strategy,
                            deadline_remaining=round(remaining, 3))
                request_started = self.clock()
                failure = None
                try:
                    response = self.session.get(
                        f"https://data.cityofnewyork.us/resource/{dataset_id}.json",
                        params=params, headers=self.headers,
                        timeout=(min(self.connect_timeout, max(1, remaining)), min(self.timeout, max(1, remaining))),
                    )
                    duration = self.clock() - request_started
                    if response.ok:
                        try:
                            payload = response.json()
                        except (ValueError, json.JSONDecodeError) as exc:
                            failure = ("malformed_json", f"invalid JSON response: {exc}", False)
                        else:
                            try:
                                self._validate_page(dataset_id, payload, requested, order_fields, primary_key)
                            except SocrataError as exc:
                                failure = (exc.reason, str(exc), False)
                            else:
                                break
                    elif response.status_code in (408, 429):
                        failure = (f"http_{response.status_code}", f"HTTP {response.status_code}", False)
                    elif response.status_code >= 500:
                        failure = ("http_5xx", f"HTTP {response.status_code}", False)
                    else:
                        raise SocrataError(f"{dataset_id}: HTTP {response.status_code}: {response.text[:300]}", "http_4xx_non_retryable")
                except requests.Timeout as exc:
                    duration = self.clock() - request_started
                    failure = ("timeout", str(exc) or "request timed out", True)
                except requests.RequestException as exc:
                    duration = self.clock() - request_started
                    failure = ("connection_error", str(exc), False)
                reason, message, shrink = failure
                retry_count += 1
                page_retries += 1
                if reason == "timeout":
                    timeout_count += 1
                previous_size = requested
                if shrink:
                    requested = sizer.on_timeout(requested)
                if attempt == self.retries:
                    suffix = " at minimum page size" if reason == "timeout" and requested == config.minimum else ""
                    raise SocrataError(f"{dataset_id}: {reason} exhausted after {attempt} attempts{suffix}: {message}", reason)
                retry_after = response.headers.get("Retry-After") if response is not None else None
                try: delay = float(retry_after) if retry_after is not None else None
                except (TypeError, ValueError): delay = None
                delay = delay if delay is not None else min(2 ** (attempt - 1), 20)
                delay = min(20, delay + self.random_fn() * min(1, delay * .25))
                if self._remaining(started) <= delay + 1:
                    self._fail_deadline(dataset_id, total)
                self._event("request_retry", source=name, offset=offset, attempt=attempt,
                            failure_reason=reason, error=message, delay_seconds=delay,
                            previous_page_size=previous_size, next_page_size=requested)
                self.sleep(delay)
            keys, ordering = self._validate_page(dataset_id, payload, requested, order_fields, primary_key)
            signature = self._signature(payload)
            if payload and signature in seen_pages:
                raise SocrataError(f"{dataset_id}: repeated page detected at offset {offset}; refusing to loop", "repeated_page")
            if any(key in seen_keys for key in keys):
                raise SocrataError(f"{dataset_id}: primary-key overlap at offset {offset}", "page_overlap")
            if last_order is not None and ordering and ordering[0] <= last_order:
                raise SocrataError(f"{dataset_id}: ordering regression across pages at offset {offset}", "ordering_regression")
            if total + len(payload) > self.max_rows:
                raise SocrataError(f"{dataset_id}: row safety limit ({self.max_rows}) exceeded", "row_ceiling_exceeded")
            if not payload:
                break
            seen_pages.add(signature)
            seen_keys.update(keys)
            last_order = ordering[-1]
            if pagination_strategy == "keyset":
                if payload[-1].get(order_fields[0]) is None:
                    raise SocrataError(f"{dataset_id}: null cursor value is not safe for keyset pagination", "unsafe_cursor")
                new_cursor = (payload[-1].get(order_fields[0]), payload[-1].get(primary_key))
                if cursor == new_cursor:
                    raise SocrataError(f"{dataset_id}: cursor made no progress", "cursor_no_progress")
                cursor = new_cursor
            total += len(payload)
            pages += 1
            durations.append(duration)
            next_size = sizer.on_success(requested, duration, len(payload))
            rate = len(payload) / duration if duration > 0 else None
            self._event("dataset_page_complete", source=name, page=pages, offset=offset,
                        page_size=requested, rows=len(payload), rows_fetched=total,
                        duration_seconds=round(duration, 3),
                        rows_per_second=round(rate, 1) if rate is not None else None,
                        retry_count=page_retries, next_page_size=next_size)
            yield from payload
            offset += len(payload)
            current_size = next_size
            if len(payload) < requested:
                break
        elapsed = self.clock() - started
        self.last_stats = {
            "pagination_strategy": pagination_strategy, "initial_page_size": config.initial,
            "minimum_page_size": config.minimum, "maximum_page_size": config.maximum,
            "final_page_size": current_size, "pages_fetched": pages,
            "retry_count": retry_count, "timeout_count": timeout_count,
            "total_rows": total, "total_duration": round(elapsed, 3),
            "average_rows_per_second": round(total / elapsed, 1) if elapsed > 0 else None,
            "minimum_observed_page_duration": round(min(durations), 3) if durations else None,
            "maximum_observed_page_duration": round(max(durations), 3) if durations else None,
        }
        self._event("dataset_completed", source=name, **self.last_stats)
