import pytest
from tree11_pipeline.validate import ValidationError, validate_relationships, validate_source
def test_duplicate_source_identity_fails():
    with pytest.raises(ValidationError): validate_source("x", [{"globalid":"same"},{"globalid":"same"}], ("globalid",))

def test_extreme_orphan_rate_fails():
    tables = {"service_requests": [{"globalid": "sr"}], "inspections": [{"globalid": "in", "servicerequestglobalid": "missing"}], "work_orders": [], "risk_assessments": []}
    with pytest.raises(ValidationError, match="orphan rate"):
        validate_relationships(tables)
