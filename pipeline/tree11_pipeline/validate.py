import json, math, re
from datetime import datetime
from .schemas import SOURCE_SCHEMAS

class ValidationError(ValueError): pass
def _reject_non_finite(value, path="root"):
    if isinstance(value, float) and not math.isfinite(value): raise ValidationError(f"non-finite number at {path}")
    if isinstance(value, dict):
        for key, child in value.items(): _reject_non_finite(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value): _reject_non_finite(child, f"{path}[{index}]")
def validate_source(name, rows, required):
    ids = []
    for i, row in enumerate(rows):
        missing = [key for key in required if not row.get(key)]
        if missing: raise ValidationError(f"{name}[{i}] missing required fields: {missing}")
        for field in SOURCE_SCHEMAS.get(name, {}).get("dates", ()):
            value = row.get(field)
            if value:
                try: datetime.fromisoformat(value.replace("Z", "+00:00"))
                except (TypeError, ValueError) as exc: raise ValidationError(f"{name}[{i}] has invalid {field}") from exc
        ids.append(str(row["globalid"]))
    if len(ids) != len(set(ids)): raise ValidationError(f"{name} has duplicate globalid values")

def validate_relationships(tables, max_orphan_rate=0.25):
    parent_ids = {
        "inspections": {str(r["globalid"]) for r in tables["service_requests"]},
        "work_orders": {str(r["globalid"]) for r in tables["inspections"]},
        "risk_assessments": {str(r["globalid"]) for r in tables["inspections"]},
    }
    results = {}
    for name, valid_ids in parent_ids.items():
        key = SOURCE_SCHEMAS[name]["relationship"]
        rows = tables[name]
        orphaned = sum(str(row.get(key)) not in valid_ids for row in rows)
        rate = orphaned / len(rows) if rows else 0
        results[name] = {"orphans": orphaned, "orphan_rate": rate}
        if rate > max_orphan_rate:
            raise ValidationError(f"{name} orphan rate {rate:.1%} exceeds {max_orphan_rate:.1%}")
    return results

def validate_history(directory):
    """Validate retained compact history; orphan links remain source-quality warnings."""
    directory=__import__('pathlib').Path(directory); history=directory/"history"
    source=[]; lifecycle=[]
    for folder, collection in ((history/"snapshots",source),(history/"lifecycle"/"snapshots",lifecycle)):
        for file in sorted(folder.glob("*.json")):
            try: collection.append(json.loads(file.read_text()))
            except (OSError, json.JSONDecodeError) as exc: raise ValidationError(f"invalid history JSON: {file.name}") from exc
    ids=[x.get("snapshot_id") for x in source]
    life_ids=[x.get("snapshot_id") for x in lifecycle]
    if None in ids or len(ids)!=len(set(ids)) or len(life_ids)!=len(set(life_ids)): raise ValidationError("duplicate or missing snapshot IDs")
    if set(life_ids)-set(ids): raise ValidationError("lifecycle references unknown snapshot")
    lifecycle=sorted(lifecycle,key=lambda x:(x.get("observed_at",""),x.get("snapshot_id","")))
    event_ids=set(); known=set(); warnings=[]
    for snapshot in lifecycle:
        observed=snapshot.get("observed_at")
        try: datetime.fromisoformat(observed.replace("Z","+00:00"))
        except (AttributeError, ValueError): raise ValidationError("invalid lifecycle observation time")
        for delta in snapshot.get("deltas",[]):
            entity=delta.get("entity",{}); key=(entity.get("entity_type"),entity.get("entity_id"))
            state_hash=entity.get("state_hash","")
            if not re.fullmatch(r"[0-9a-f]{64}",state_hash): raise ValidationError("malformed state hash")
            if delta.get("change_type") not in {"ADDED","CHANGED","REMOVED_FROM_CURRENT_SOURCE"}: raise ValidationError("invalid lifecycle delta ordering")
            known.add(key)
        for event in snapshot.get("events",[]):
            eid=event.get("event_id")
            if not isinstance(eid,str) or eid in event_ids: raise ValidationError("duplicate event IDs")
            event_ids.add(eid)
            try: retrieved=datetime.fromisoformat(event["retrieved_at"].replace("Z","+00:00"))
            except (KeyError, AttributeError, ValueError): raise ValidationError("invalid event ordering")
            if retrieved != datetime.fromisoformat(observed.replace("Z","+00:00")): raise ValidationError("invalid event ordering")
    rel_file=history/"relationships.json"
    if rel_file.exists():
        for rel in json.loads(rel_file.read_text()).get("relationships",[]):
            parent=(rel.get("parent_entity_type"),rel.get("parent_entity_id")); child=(rel.get("child_entity_type"),rel.get("child_entity_id"))
            if parent not in known or child not in known: warnings.append("direct relationship references a disappeared entity")
    timing=history/"monthly_timing.json"
    if timing.exists():
        for month in json.loads(timing.read_text()).get("months",[]):
            for metric in ("inspection_timing","work_order_timing"):
                if month.get(metric,{}).get("median") is not None and month[metric]["median"] < 0: raise ValidationError("impossible negative duration")
    return warnings

def validate_assets(directory, max_map_bytes=5_000_000):
    directory = __import__('pathlib').Path(directory)
    summary = json.loads((directory / "summary.json").read_text())
    manifest = json.loads((directory / "manifest.json").read_text())
    _reject_non_finite(summary); _reject_non_finite(manifest)
    if not summary.get("generated_at") or not manifest.get("datasets"): raise ValidationError("missing artifact metadata")
    if manifest.get("format_version") not in (1, 2) or manifest.get("validation_status") != "valid": raise ValidationError("unsupported or unvalidated artifact format")
    if manifest.get("format_version") == 2 and manifest.get("refresh", {}).get("status") != "success": raise ValidationError("missing successful refresh metadata")
    geo = json.loads((directory / "map" / "points.geojson").read_text())
    _reject_non_finite(geo)
    if geo.get("type") != "FeatureCollection" or not geo.get("features"): raise ValidationError("invalid or empty GeoJSON")
    if (directory / "map" / "points.geojson").stat().st_size > max_map_bytes: raise ValidationError("map payload exceeds configured maximum")
    ids = set()
    for feature in geo["features"]:
        coords = feature.get("geometry", {}).get("coordinates", [])
        if len(coords) != 2 or not all(isinstance(x, (int,float)) and math.isfinite(x) for x in coords): raise ValidationError("invalid map coordinates")
        if not (-74.4 <= coords[0] <= -73.5 and 40.4 <= coords[1] <= 41.0): raise ValidationError("coordinates outside NYC bounds")
        if feature.get("id") in ids: raise ValidationError("duplicate map feature ID")
        ids.add(feature.get("id"))
    for chart in (directory / "charts").glob("*.json"):
        data = json.loads(chart.read_text())
        _reject_non_finite(data)
        labels = data.get("labels", [])
        for series in data.get("datasets", []):
            if len(series.get("data", [])) != len(labels): raise ValidationError(f"{chart.name}: labels/data length mismatch")
    trend = json.loads((directory / "history" / "trend.json").read_text())
    _reject_non_finite(trend)
    if trend.get("format_version") not in (1, 2): raise ValidationError("unsupported history format")
    for series in trend.get("datasets", []):
        if len(series.get("data", [])) != len(trend.get("labels", [])): raise ValidationError("history labels/data length mismatch")
    lifecycle = json.loads((directory / "history" / "lifecycle_summary.json").read_text())
    quality = json.loads((directory / "history" / "quality.json").read_text())
    transitions = json.loads((directory / "history" / "transition_matrix.json").read_text())
    _reject_non_finite(lifecycle); _reject_non_finite(quality); _reject_non_finite(transitions)
    if lifecycle.get("schema_version") != 1 or quality.get("lifecycle_rows") is None: raise ValidationError("invalid lifecycle artifacts")
    for name in ("overview","lifecycle_funnel","backlog","timing_monthly","cohorts","geography","anomalies","metric_contracts"):
        file=directory/"research"/(name+".json")
        if not file.exists(): raise ValidationError(f"missing research artifact: {name}")
        payload=json.loads(file.read_text()); _reject_non_finite(payload)
        if payload.get("schema_version") != 1: raise ValidationError(f"invalid research schema: {name}")
    for name in ("current.json","trend.json"):
        payload=json.loads((directory/"quality"/name).read_text()); _reject_non_finite(payload)
    validate_history(directory)
    return True
