from tree11_pipeline.research.artifacts import build_research
from tree11_pipeline.publish import publish
from tree11_pipeline.transform import build_model
import json, shutil
from pathlib import Path

def test_research_respects_censoring_backlog_and_small_groups():
    tables={"service_requests":[{"globalid":"s1","createddate":"2026-01-01T00:00:00+00:00","status":"Open","borough":"M"}],"inspections":[],"work_orders":[],"risk_assessments":[]}
    rows=[{"service_request_id":"s1","request_created_at":"2026-01-01T00:00:00+00:00","first_inspection_at":None,"first_work_order_at":None,"work_order_completed_at":None,"is_censored":True}]
    result=build_research(tables,rows,"2026-01-10T00:00:00+00:00",minimum_group_n=5)
    assert result["backlog"]["open_requests"] == 1
    assert result["overview"]["timing"]["request_to_first_inspection_hours"]["median"] is None
    assert result["cohorts"]["rows"][0]["eligible_for_horizon"] is True
    assert result["geography"]["rows"][0]["suppressed"] is True

def test_survival_rows_keep_unobserved_endpoints():
    tables={"service_requests":[{"globalid":"s","createddate":"2026-01-01T00:00:00+00:00"}],"inspections":[],"work_orders":[],"risk_assessments":[]}
    rows=[{"service_request_id":"s","request_created_at":"2026-01-01T00:00:00+00:00","first_inspection_at":None,"first_work_order_at":None,"work_order_completed_at":None,"is_censored":True}]
    assert all(not x["event_observed"] and x["is_censored"] for x in build_research(tables,rows,"2026-01-02T00:00:00+00:00")["survival"])

def test_multisnapshot_fixture_publishes_research_bundle_atomically():
    snapshots=json.loads((Path(__file__).parent/"fixtures"/"lifecycle_snapshots.json").read_text())
    target=Path(__file__).parent/".research-output"/"data"; shutil.rmtree(target.parent,ignore_errors=True)
    try:
        for index, tables in enumerate(snapshots.values(), start=1): publish(build_model(tables,f"2026-01-0{index}T00:00:00+00:00"),target,tables,5_000_000)
        assert json.loads((target/"research"/"backlog.json").read_text())["open_requests"] == 1
        assert len(json.loads((target/"research"/"cohorts.json").read_text())["rows"]) == 5
    finally: shutil.rmtree(target.parent,ignore_errors=True)
