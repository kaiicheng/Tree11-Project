import json
from pathlib import Path
from tree11_pipeline.transform import build_model

def tables(): return json.loads((Path(__file__).parent/"fixtures"/"tables.json").read_text())
def test_one_feature_per_service_request_and_child_aggregation():
    model=build_model(tables(), "2026-09-01T00:00:00+00:00")
    assert [f["id"] for f in model["geojson"]["features"]] == ["sr-1", "sr-2"]
    feature=model["geojson"]["features"][1]
    assert feature["properties"]["inspection_count"] == 2
    assert feature["properties"]["work_order_count"] == 2
    assert model["summary"]["uninspected_requests"] == 2  # includes coordinate-invalid SR
def test_chart_series_match_labels():
    for chart in build_model(tables())["charts"].values():
        assert all(len(s["data"]) == len(chart["labels"]) for s in chart["datasets"])

def test_live_source_field_names_and_pending_work_order_asset():
    source = tables()
    source["service_requests"][0].update({"srsource": "TreesCount!", "srstatus": "Open", "boroughcode": "Queens"})
    source["work_orders"][0].update({"wotype": "Pruning", "wostatus": "Pending", "createddate": "2026-07-06T00:00:00.000"})
    source["work_orders"][1].update({"wotype": "Removal", "wostatus": "Completed", "createddate": "2026-07-07T00:00:00.000"})
    model = build_model(source, "2026-09-01T00:00:00+00:00")
    feature = model["geojson"]["features"][0]
    assert {key: feature["properties"][key] for key in ("source", "status", "borough")} == {"source": "TreesCount!", "status": "Open", "borough": "Queens"}
    assert model["charts"]["pending_work_orders_by_type"] == {"labels": ["Pruning"], "datasets": [{"label": "Pending work orders", "data": [1]}]}
