import json
import shutil
import tempfile
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from .config import DATASETS, REQUIRED, SOURCES
from .socrata import SocrataClient
from .validate import validate_source

def write_canonical(rows, name, destination):
    rows = sorted(rows, key=lambda r: str(r["globalid"]))
    validate_source(name, rows, REQUIRED[name])
    destination.mkdir(parents=True, exist_ok=True)
    # JSONL is the dependency-free canonical fallback; parquet is preferred when available.
    (destination / f"{name}.jsonl").write_text("".join(json.dumps(r, sort_keys=True, separators=(",", ":")) + "\n" for r in rows), encoding="utf-8")
    try:
        import pandas as pd
        pd.DataFrame(rows).to_parquet(destination / f"{name}.parquet", index=False)
    except ImportError: pass
    return rows

def _where_since(source, field, cutoff):
    if source.date_filter_mode != "month_extract":
        return f"{field} >= '{cutoff.isoformat()}'"
    months = []
    current = cutoff.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    while current <= end:
        months.append(f"(date_extract_y({field}) = {current.year} AND date_extract_m({field}) = {current.month})")
        current = current.replace(year=current.year + 1, month=1) if current.month == 12 else current.replace(month=current.month + 1)
    return "(" + " OR ".join(months) + ")"

def _incremental_where(source, previous, lookback_days):
    if not previous or not source.incremental:
        return None
    field = source.incremental_field or source.order_fields[0]
    values = [r.get(field) for r in previous if r.get(field)]
    if not values: return None
    try:
        cutoff = datetime.fromisoformat(max(values).replace("Z", "+00:00")) - timedelta(days=lookback_days)
        return _where_since(source, field, cutoff)
    except ValueError:
        return None

def _rolling_where(source, lookback_days):
    cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)
    return _where_since(source, source.incremental_field or "createddate", cutoff)

def fetch_all(settings, return_metadata=False, full=False):
    client = SocrataClient(settings.app_token, settings.timeout, settings.retries, settings.max_dataset_seconds, settings.max_source_rows, connect_timeout=settings.connect_timeout)
    result, sources = {}, {}
    settings.canonical_dir.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix="canonical-build-", dir=settings.canonical_dir.parent))
    try:
      for name, dataset_id in DATASETS.items():
        source = SOURCES[name]
        started = time.monotonic()
        try:
            try:
                prior_rows = read_canonical(settings.canonical_dir).get(name, []) if settings.canonical_dir.exists() and not full else []
            except (OSError, json.JSONDecodeError):
                prior_rows = []
            incremental_where = _incremental_where(source, prior_rows, source.lookback_days or settings.lookback_days)
            full_cutoff = datetime.fromisoformat(settings.analysis_start.replace("Z", "+00:00"))
            where = incremental_where or (_where_since(source, source.incremental_field or "createddate", full_cutoff) if full else _rolling_where(source, settings.lookback_days))
            fetched = list(client.rows(dataset_id, order=source.order, page_size=source.page_size,
                                    where=where,
                                    dataset_name=name, primary_key=source.primary_key,
                                    pagination_strategy=source.pagination_strategy))
            if prior_rows and source.incremental and incremental_where:
                by_id = {str(r[source.primary_key]): r for r in prior_rows}
                by_id.update({str(r[source.primary_key]): r for r in fetched})
                rows = list(by_id.values())
            else:
                rows = fetched
            result[name] = write_canonical(rows, name, staging)
            sources[name] = {**client.last_stats, "rows": len(rows),
                             "duration_seconds": round(time.monotonic()-started, 3), "status": "success"}
            print(json.dumps({"event":"source_written","dataset":name,"rows":len(rows),"elapsed_seconds":round(time.monotonic()-started,3)}, sort_keys=True), flush=True)
        except Exception as exc:
            print(json.dumps({"event":"source_failed","dataset":name,"elapsed_seconds":round(time.monotonic()-started,3),"error":str(exc)}, sort_keys=True), flush=True)
            raise
      previous = settings.canonical_dir.with_name(settings.canonical_dir.name + ".previous")
      if previous.exists(): shutil.rmtree(previous)
      if settings.canonical_dir.exists(): settings.canonical_dir.replace(previous)
      try:
          staging.replace(settings.canonical_dir)
      except Exception:
          if previous.exists() and not settings.canonical_dir.exists(): previous.replace(settings.canonical_dir)
          raise
      if previous.exists(): shutil.rmtree(previous)
    except Exception:
      shutil.rmtree(staging, ignore_errors=True)
      raise
    return (result, sources) if return_metadata else result

def probe_source(settings, name, max_pages=3, max_rows=30_000):
    if name not in SOURCES:
        raise ValueError(f"unknown source: {name}")
    source = SOURCES[name]
    client = SocrataClient(settings.app_token, settings.timeout, settings.retries,
                           settings.max_dataset_seconds, settings.max_source_rows,
                           connect_timeout=settings.connect_timeout)
    rows = list(client.rows(source.dataset_id, order=source.order, page_size=source.page_size,
                            dataset_name=name, primary_key=source.primary_key,
                            max_pages=max_pages, max_probe_rows=max_rows,
                            pagination_strategy=source.pagination_strategy))
    return {**client.last_stats, "source": name, "probe": True, "rows": len(rows)}

def read_canonical(directory):
    out = {}
    for name in DATASETS:
        path = Path(directory) / f"{name}.jsonl"
        out[name] = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]
    return out
