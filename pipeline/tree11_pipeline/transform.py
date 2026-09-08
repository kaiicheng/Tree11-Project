"""Deterministic transformations with an explicit serving grain."""
from collections import defaultdict
from datetime import datetime, timezone

from .validate import validate_relationships


def pick(row, *names):
    for name in names:
        if row.get(name) not in (None, ""):
            return row[name]
    return None


def date(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def month(row, *fields):
    value = date(pick(row, *fields))
    return value.strftime("%Y-%m") if value else None


def coordinates(row):
    try:
        lon, lat = float(pick(row, "longitude", "long")), float(pick(row, "latitude", "lat"))
        return [lon, lat] if -74.4 <= lon <= -73.5 and 40.4 <= lat <= 41 else None
    except (TypeError, ValueError):
        return None


def _series(rows, months, category, date_fields, label):
    return {"label": label, "data": [sum(category(row) and month(row, *date_fields) == value for row in rows) for value in months]}


def build_model(tables, generated_at=None):
    quality = validate_relationships(tables)
    srs, inspections = tables["service_requests"], tables["inspections"]
    work, risks = tables["work_orders"], tables["risk_assessments"]
    by_sr, by_ins_work, by_ins_risk = defaultdict(list), defaultdict(list), defaultdict(list)
    inspection_by_id = {str(row["globalid"]): row for row in inspections}
    for row in inspections: by_sr[str(row["servicerequestglobalid"])].append(row)
    for row in work: by_ins_work[str(row["inspectionglobalid"])].append(row)
    for row in risks: by_ins_risk[str(row["inspectionglobalid"])].append(row)

    features = []
    for sr in sorted(srs, key=lambda row: str(row["globalid"])):
        coords = coordinates(sr)
        if not coords: continue
        children = by_sr.get(str(sr["globalid"]), [])
        child_work = [row for inspection in children for row in by_ins_work.get(str(inspection["globalid"]), [])]
        child_risk = [row for inspection in children for row in by_ins_risk.get(str(inspection["globalid"]), [])]
        latest_inspection = max(children, key=lambda row: pick(row, "inspectiondate", "updateddate", "createddate") or "", default={})
        latest_work = max(child_work, key=lambda row: pick(row, "updateddate", "createddate", "closeddate") or "", default={})
        features.append({"type": "Feature", "id": sr["globalid"], "geometry": {"type": "Point", "coordinates": coords}, "properties": {
            "service_request_id": sr["globalid"], "created_date": pick(sr, "createddate"),
            "status": pick(sr, "srstatus", "status"), "source": pick(sr, "srsource", "source"),
            "borough": pick(sr, "boroughcode", "borough"), "inspection_count": len(children),
            "latest_inspection_date": pick(latest_inspection, "inspectiondate", "updateddate", "createddate"),
            "work_order_count": len(child_work), "latest_work_order_status": pick(latest_work, "wostatus", "status"),
            "latest_work_order_type": pick(latest_work, "wotype", "workordertype"),
            "risk_assessment_count": len(child_risk),
            "max_risk_rating": max((str(pick(row, "riskrating")) for row in child_risk if pick(row, "riskrating")), default=None),
        }})

    months = sorted({value for rows, fields in ((srs, ("createddate",)), (inspections, ("inspectiondate", "createddate")), (work, ("createddate", "updateddate"))) for row in rows if (value := month(row, *fields))})
    source_names = sorted({str(pick(row, "srsource", "source") or "Unknown") for row in srs})
    source_chart = {"labels": months, "datasets": [_series(srs, months, lambda row, name=name: str(pick(row, "srsource", "source") or "Unknown") == name, ("createddate",), name) for name in source_names]}

    risk_months = sorted({value for row in risks if (inspection := inspection_by_id.get(str(row.get("inspectionglobalid")))) and (value := month(inspection, "inspectiondate", "createddate"))})
    risk_names = sorted({str(pick(row, "riskrating") or "Unknown") for row in risks})
    risk_chart = {"labels": risk_months, "datasets": [{"label": name, "data": [sum(str(pick(row, "riskrating") or "Unknown") == name and (inspection := inspection_by_id.get(str(row.get("inspectionglobalid")))) is not None and month(inspection, "inspectiondate", "createddate") == value for row in risks) for value in risk_months]} for name in risk_names]}

    pending = [row for row in work if str(pick(row, "wostatus", "status") or "").lower() not in {"completed", "complete", "cancelled", "canceled"}]
    work_types = sorted({str(pick(row, "wotype", "workordertype") or "Unknown") for row in pending})
    pending_chart = {"labels": work_types, "datasets": [{"label": "Pending work orders", "data": [sum(str(pick(row, "wotype", "workordertype") or "Unknown") == name for row in pending) for name in work_types]}]}
    operational_chart = {"labels": months, "datasets": [
        _series(srs, months, lambda _: True, ("createddate",), "Service requests"),
        _series(inspections, months, lambda _: True, ("inspectiondate", "createddate"), "Inspections"),
        _series(work, months, lambda _: True, ("createddate", "updateddate"), "Work orders"),
    ]}

    generated = generated_at or datetime.now(timezone.utc).isoformat()
    generated_date = date(generated) or datetime.now(timezone.utc)
    complete_year, complete_month = (generated_date.year - 1, 12) if generated_date.month == 1 else (generated_date.year, generated_date.month - 1)
    last_complete = f"{complete_year:04d}-{complete_month:02d}"
    data_through = max((value for rows in tables.values() for row in rows if (value := pick(row, "updateddate", "createddate"))), default=None)
    return {
        "geojson": {"type": "FeatureCollection", "features": features},
        "charts": {"service_requests_by_source": source_chart, "inspections_by_risk_monthly": risk_chart, "pending_work_orders_by_type": pending_chart, "operational_volume_monthly": operational_chart},
        "summary": {"generated_at": generated, "data_through": data_through, "last_complete_month": last_complete,
            "last_month_requests": sum(month(row, "createddate") == last_complete for row in srs),
            "uninspected_requests": sum(not by_sr.get(str(row["globalid"])) for row in srs),
            "inspections_in_period": len(inspections), "map_feature_count": len(features),
            "excluded_invalid_coordinate_count": len(srs) - len(features), "relationship_quality": quality},
    }
