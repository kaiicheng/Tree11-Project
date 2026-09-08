import json, shutil
from pathlib import Path
from tree11_pipeline.transform import build_model
from tree11_pipeline.publish import publish
from tree11_pipeline.validate import validate_assets
def test_publish_is_valid_and_deterministic():
    tables=json.loads((Path(__file__).parent/"fixtures"/"tables.json").read_text())
    target=Path(__file__).parent / ".test-output" / "data"; shutil.rmtree(target.parent, ignore_errors=True)
    try:
        model=build_model(tables,"2026-09-01T00:00:00+00:00")
        publish(model,target,tables,5_000_000); first=(target/"map"/"points.geojson").read_bytes()
        publish(model,target,tables,5_000_000)
        assert first == (target/"map"/"points.geojson").read_bytes()
        assert validate_assets(target)
        metadata=json.loads((target/"manifest.json").read_text())["refresh"]
        assert metadata["status"] == "success" and metadata["snapshot_id"]
    finally: shutil.rmtree(target.parent, ignore_errors=True)

def test_history_tracks_changes_and_retention():
    tables=json.loads((Path(__file__).parent/"fixtures"/"tables.json").read_text())
    target=Path(__file__).parent / ".test-output" / "data"; shutil.rmtree(target.parent, ignore_errors=True)
    try:
        publish(build_model(tables,"2026-09-01T00:00:00+00:00"),target,tables,5_000_000,2)
        first=json.loads((target/"manifest.json").read_text()); assert first["change_counts"]["added"] == 9
        publish(build_model(tables,"2026-09-02T00:00:00+00:00"),target,tables,5_000_000,2)
        assert len(list((target/"history"/"snapshots").glob("*.json"))) == 1
        changed=json.loads(json.dumps(tables)); changed["service_requests"][0]["source"]="Web"; changed["service_requests"].pop(); changed["work_orders"].append({"globalid":"wo-3","inspectionglobalid":"in-2"})
        publish(build_model(changed,"2026-09-03T00:00:00+00:00"),target,changed,5_000_000,2)
        manifest=json.loads((target/"manifest.json").read_text())
        assert manifest["change_counts"] == {"added":1,"changed":1,"removed":1}
        assert len(json.loads((target/"history"/"trend.json").read_text())["labels"]) == 2
    finally: shutil.rmtree(target.parent, ignore_errors=True)

def test_failed_validation_does_not_replace_current_assets():
    tables=json.loads((Path(__file__).parent/"fixtures"/"tables.json").read_text())
    target=Path(__file__).parent / ".test-output" / "data"; shutil.rmtree(target.parent, ignore_errors=True)
    try:
        publish(build_model(tables,"2026-09-01T00:00:00+00:00"),target,tables,5_000_000)
        before=(target/"manifest.json").read_bytes()
        history_before={p.relative_to(target):p.read_bytes() for p in (target/"history").rglob("*.json")}
        invalid=build_model(tables,"2026-09-02T00:00:00+00:00"); invalid["geojson"]["features"][0]["geometry"]["coordinates"]=[0,0]
        try: publish(invalid,target,tables,5_000_000)
        except Exception: pass
        else: raise AssertionError("invalid map should not publish")
        assert (target/"manifest.json").read_bytes() == before
        assert history_before == {p.relative_to(target):p.read_bytes() for p in (target/"history").rglob("*.json")}
    finally: shutil.rmtree(target.parent, ignore_errors=True)

def test_adaptive_metadata_is_preserved_in_manifest():
    tables=json.loads((Path(__file__).parent/"fixtures"/"tables.json").read_text())
    target=Path(__file__).parent / ".test-output" / "data"; shutil.rmtree(target.parent, ignore_errors=True)
    stats={"pagination_strategy":"offset","initial_page_size":10000,"minimum_page_size":2000,
           "maximum_page_size":30000,"final_page_size":12500,"pages_fetched":2,"retry_count":1,
           "timeout_count":1,"total_rows":len(tables["service_requests"]),"total_duration":8.0,
           "average_rows_per_second":1250.0,"minimum_observed_page_duration":3.0,
           "maximum_observed_page_duration":5.0,"rows":len(tables["service_requests"]),"status":"success"}
    refresh={"status":"success","sources":{"service_requests":stats}}
    try:
        publish(build_model(tables,"2026-09-01T00:00:00+00:00"),target,tables,5_000_000,refresh=refresh)
        actual=json.loads((target/"manifest.json").read_text())["refresh"]["sources"]["service_requests"]
        assert actual == stats
        assert validate_assets(target)
    finally: shutil.rmtree(target.parent, ignore_errors=True)

def test_sequential_fixture_history_is_temporally_safe_and_replayable():
    sequence=json.loads((Path(__file__).parent/"fixtures"/"lifecycle_snapshots.json").read_text())
    target=Path(__file__).parent / ".test-output" / "sequential"; shutil.rmtree(target.parent, ignore_errors=True)
    try:
        def run(name):
            tables=sequence[name]; publish(build_model(tables,f"2026-01-0{ord(name)-64}T00:00:00+00:00"),target,tables,5_000_000,4)
        run("A"); run("B")
        after_b=(target/"history"/"lifecycle"/"snapshots").read_bytes() if False else {p.name:p.read_bytes() for p in (target/"history"/"lifecycle"/"snapshots").glob("*.json")}
        run("B"); assert after_b == {p.name:p.read_bytes() for p in (target/"history"/"lifecycle"/"snapshots").glob("*.json")}
        run("C"); run("D")
        lifecycle=sorted((json.loads(p.read_text()) for p in (target/"history"/"lifecycle"/"snapshots").glob("*.json")), key=lambda x:x["observed_at"])
        assert len(lifecycle)==4
        from tree11_pipeline.lifecycle import replay
        b=next(x for x in lifecycle if x["observed_at"].startswith("2026-01-02"))
        assert replay(lifecycle,b["observed_at"])[("service_request","sr-main")]["state"]["status"] == "Open"
        events=[e["event_type"] for s in lifecycle for e in s["events"]]
        assert sum(len(s["unchanged_entities"]) for s in lifecycle) > 0
        assert {"REQUEST_CREATED","SOURCE_RECORD_DISAPPEARED","REQUEST_STATUS_CHANGED","WORK_ORDER_STATUS_CHANGED"} <= set(events)
        assert json.loads((target/"history"/"transition_matrix.json").read_text())["transitions"]
        assert json.loads((target/"history"/"lifecycle_summary.json").read_text())["median_work_order_to_completion_hours"] == 24.0
        assert validate_assets(target)
    finally: shutil.rmtree(target.parent, ignore_errors=True)
