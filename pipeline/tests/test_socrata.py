import json
import pytest
import requests

from tree11_pipeline.config import PageSizeConfig, SourceConfig
from tree11_pipeline.socrata import AdaptivePageSizer, SocrataClient, SocrataError


def row(index, timestamp=None):
    return {"globalid": f"id-{index:05d}", "updateddate": timestamp or f"2026-01-01T00:{index // 60:02d}:{index % 60:02d}.000"}


class Response:
    ok = True
    status_code = 200
    headers = {}
    text = ""
    def __init__(self, value): self.value = value
    def json(self): return self.value


class OffsetSession:
    def __init__(self, rows): self.rows, self.calls = rows, []
    def get(self, url, **kwargs):
        params = kwargs["params"]
        self.calls.append(params.copy())
        start, limit = params["$offset"], params["$limit"]
        return Response(self.rows[start:start + limit])


@pytest.mark.parametrize("duration,expected", [(2, 1250), (10, 1000), (16, 700)])
def test_adaptive_success_policy(duration, expected):
    assert AdaptivePageSizer(100, 2000, 10).on_success(1000, duration, 1000) == expected


def test_adaptive_bounds_and_timeout():
    sizer = AdaptivePageSizer(500, 1200, 10)
    assert sizer.on_success(1200, 1, 1200) == 1200
    assert sizer.on_success(500, 20, 500) == 500
    assert sizer.on_timeout(1200) == 600
    assert sizer.on_timeout(500) == 500


def test_source_config_requires_unique_tie_breaker():
    with pytest.raises(ValueError, match="tie-breaker"):
        SourceConfig("abc", ("updateddate",))


def test_stable_adaptive_offset_pagination_and_partial_final_page():
    session = OffsetSession([row(i) for i in range(5)])
    client = SocrataClient(session=session, log=None)
    result = list(client.rows("abc", limit=2))
    assert len(result) == 5
    assert [call["$offset"] for call in session.calls] == [0, 2, 4]
    assert all(call["$order"] == "updateddate,globalid" for call in session.calls)
    assert client.last_stats["pages_fetched"] == 3


def test_empty_final_page_is_explicit_termination():
    session = OffsetSession([row(0), row(1)])
    result = list(SocrataClient(session=session, log=None).rows("abc", limit=2))
    assert len(result) == 2
    assert [call["$offset"] for call in session.calls] == [0, 2]


def test_timeout_retries_same_offset_at_smaller_size_and_records_metadata():
    class Flaky(OffsetSession):
        def get(self, url, **kwargs):
            self.calls.append(kwargs["params"].copy())
            if len(self.calls) == 1: raise requests.Timeout("slow")
            p = kwargs["params"]
            return Response(self.rows[p["$offset"]:p["$offset"] + p["$limit"]])
    session = Flaky([row(i) for i in range(4)])
    events = []
    client = SocrataClient(session=session, sleep=lambda _: None,
                           log=lambda message, **_: events.append(json.loads(message)))
    result = list(client.rows("abc", page_size=PageSizeConfig(4, 1, 8), max_pages=1))
    assert len(result) == 2
    assert [(c["$offset"], c["$limit"]) for c in session.calls] == [(0, 4), (0, 2)]
    assert client.last_stats["timeout_count"] == client.last_stats["retry_count"] == 1
    page_event = next(event for event in events if event["event"] == "dataset_page_complete")
    assert page_event["page_size"] == 2 and "rows_per_second" in page_event


def test_repeated_timeout_at_minimum_fails_clearly():
    class AlwaysTimeout:
        def get(self, url, **kwargs): raise requests.Timeout("slow")
    with pytest.raises(SocrataError, match="at minimum page size") as error:
        list(SocrataClient(session=AlwaysTimeout(), retries=3, log=None, sleep=lambda _: None)
             .rows("abc", page_size=PageSizeConfig(2, 1, 4)))
    assert error.value.reason == "timeout"


def test_repeated_page_is_rejected():
    class Repeat:
        def get(self, url, **kwargs): return Response([row(0), row(1)])
    with pytest.raises(SocrataError, match="repeated page"):
        list(SocrataClient(session=Repeat(), log=None).rows("abc", limit=2))


def test_overlap_between_pages_is_rejected():
    class Overlap:
        def get(self, url, **kwargs):
            return Response([row(0), row(1)] if kwargs["params"]["$offset"] == 0 else [row(1), row(2)])
    with pytest.raises(SocrataError, match="overlap"):
        list(SocrataClient(session=Overlap(), log=None).rows("abc", limit=2))


def test_duplicate_order_value_uses_unique_tie_breaker():
    same = "2026-01-01T00:00:00.000"
    session = OffsetSession([row(0, same), row(1, same)])
    assert len(list(SocrataClient(session=session, log=None).rows("abc", limit=2))) == 2


def test_keyset_pagination_advances_cursor_and_escapes_values():
    class Keyset:
        def __init__(self): self.calls = []
        def get(self, url, **kwargs):
            self.calls.append(kwargs["params"].copy())
            return Response([[row(0, "2026-01-01T00:00:00.000")],
                              [row(1, "2026-01-01T00:00:00.000")], []][len(self.calls)-1])
    session = Keyset()
    result = list(SocrataClient(session=session, log=None).rows("abc", limit=1,
        pagination_strategy="keyset"))
    assert [r["globalid"] for r in result] == ["id-00000", "id-00001"]
    assert "$offset" not in session.calls[0]
    assert "globalid > 'id-00000'" in session.calls[1]["$where"]


def test_keyset_rejects_no_cursor_progress():
    class Same:
        def get(self, url, **kwargs): return Response([row(0)])
    with pytest.raises(SocrataError, match="repeated page|cursor"):
        list(SocrataClient(session=Same(), log=None).rows("abc", limit=1,
            pagination_strategy="keyset"))


def test_ordering_regression_is_rejected():
    session = OffsetSession([row(1), row(0)])
    with pytest.raises(SocrataError, match="ordering regression"):
        list(SocrataClient(session=session, retries=1, log=None).rows("abc", limit=2))


def test_null_ordering_values_form_stable_final_bucket():
    rows = [row(0), {"globalid":"id-00001"}, {"globalid":"id-00002"}]
    assert len(list(SocrataClient(session=OffsetSession(rows), log=None).rows("abc", limit=2))) == 3


@pytest.mark.parametrize("payload", [{"error": "nope"}, [{"updateddate": "x"}], [row(0), row(0)]])
def test_malformed_pages_are_bounded_and_rejected(payload):
    class Bad:
        def get(self, url, **kwargs): return Response(payload)
    with pytest.raises(SocrataError):
        list(SocrataClient(session=Bad(), retries=2, log=None, sleep=lambda _: None).rows("abc", limit=2))


def test_row_ceiling_terminates_before_acceptance():
    with pytest.raises(SocrataError, match="row safety limit") as error:
        list(SocrataClient(session=OffsetSession([row(0), row(1)]), max_rows=1, log=None).rows("abc", limit=2))
    assert error.value.reason == "row_ceiling_exceeded"


def test_source_deadline_terminates_without_request():
    class Clock:
        def __init__(self): self.calls = 0
        def __call__(self):
            self.calls += 1
            return 0 if self.calls == 1 else 2
    class Never:
        def get(self, url, **kwargs): raise AssertionError("request must not start")
    with pytest.raises(SocrataError, match="source deadline") as error:
        list(SocrataClient(session=Never(), max_dataset_seconds=1, clock=Clock(), log=None).rows("abc", limit=2))
    assert error.value.reason == "source_deadline_exceeded"
