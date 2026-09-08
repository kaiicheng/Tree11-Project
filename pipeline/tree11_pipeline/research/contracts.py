"""Versioned public metric contracts.  Values are descriptive, not causal."""
from dataclasses import asdict, dataclass

@dataclass(frozen=True)
class MetricContract:
    metric_id: str; label: str; description: str; grain: str; unit: str
    numerator_definition: str; denominator_definition: str; timestamp_semantics: str
    censoring_policy: str; minimum_sample_policy: str = "Suppress distribution statistics below minimum_group_n"
    metric_version: int = 1
    def public(self): return asdict(self)

def contracts():
    count = "Current accepted source records; duplicate source IDs are rejected."
    duration = "Only non-negative source event timestamps; cases without the endpoint are right-censored."
    return [
        MetricContract("request_count", "Requests", count, "service request", "count", count, count, "Source creation timestamp", "Not applicable"),
        MetricContract("inspection_count", "Inspections", count, "inspection", "count", count, count, "Source inspection timestamp", "Not applicable"),
        MetricContract("work_order_count", "Work orders", count, "work order", "count", count, count, "Source work-order creation timestamp", "Not applicable"),
        MetricContract("request_to_first_inspection_hours", "Request to first inspection", duration, "service request", "hours", "Observed request-to-first-inspection durations", "Requests with valid request and inspection times", "Source event timestamps", "Unobserved endpoints are excluded from completed-duration distribution and retained in survival data"),
        MetricContract("request_to_first_work_order_hours", "Request to first work order", duration, "service request", "hours", "Observed request-to-first-work-order durations", "Requests with valid request and work-order times", "Source event timestamps", "Unobserved endpoints are excluded from completed-duration distribution and retained in survival data"),
        MetricContract("work_order_to_completion_hours", "Work order to completion", duration, "work order", "hours", "Observed work-order completion durations", "Work orders with valid creation and completion times", "Source completion timestamp", "Open work orders are right-censored"),
        MetricContract("current_age_hours", "Current open age", "Age at the accepted observation time, not a completion duration.", "open entity", "hours", "Open entities with valid start times", "Open entities with valid start times", "Accepted snapshot observation time", "Closed records are excluded"),
    ]
