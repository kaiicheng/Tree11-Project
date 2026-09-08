from tree11_pipeline.lifecycle import advance, replay

def tables(status="Open"):
    return {"service_requests":[{"globalid":"sr","createddate":"2026-01-01T00:00:00+00:00","status":status}],"inspections":[],"work_orders":[],"risk_assessments":[]}
def test_diff_events_and_replay_are_deterministic():
    a=advance(tables(),[],"2026-01-01T00:00:00+00:00","a")
    assert a["deltas"][0]["change_type"] == "ADDED"
    same=advance(tables(),[a],"2026-01-02T00:00:00+00:00","b")
    assert same["deltas"] == [] and same["events"] == [] and same["unchanged_entities"] == [{"entity_type":"service_request","entity_id":"sr"}]
    b=advance(tables("Closed"),[a],"2026-01-03T00:00:00+00:00","c")
    assert b["deltas"][0]["changed_fields"]["status"] == {"before":"Open","after":"Closed"}
    assert replay([a,b],"2026-01-02T00:00:00+00:00")[("service_request","sr")]["state"]["status"] == "Open"
    assert b["events"][0]["event_id"] == advance(tables("Closed"),[a],"2026-01-03T00:00:00+00:00","z")["events"][0]["event_id"]

def test_removal_is_not_closure():
    a=advance(tables(),[],"2026-01-01T00:00:00+00:00","a")
    b=advance({"service_requests":[],"inspections":[],"work_orders":[],"risk_assessments":[]},[a],"2026-01-02T00:00:00+00:00","b")
    assert b["events"][0]["event_type"] == "SOURCE_RECORD_DISAPPEARED"
