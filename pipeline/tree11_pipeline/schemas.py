"""Explicit source contracts for canonical NYC Forestry records."""

SOURCE_SCHEMAS = {
    "service_requests": {"dates": ("initiateddate", "closeddate", "createddate", "updateddate"), "relationship": None},
    "inspections": {"dates": ("inspectiondate", "closeddate", "createddate", "updateddate"), "relationship": "servicerequestglobalid"},
    "work_orders": {"dates": ("actualfinishdate", "closeddate", "canceldate", "createddate", "updateddate"), "relationship": "inspectionglobalid"},
    "risk_assessments": {"dates": ("createddate",), "relationship": "inspectionglobalid"},
}
