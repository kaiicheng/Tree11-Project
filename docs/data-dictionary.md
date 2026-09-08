# Tree11 research data dictionary

| Field | Grain | Meaning |
| --- | --- | --- |
| `service_request_id` | service request | Stable source `globalid`. |
| `request_created_at` | service request | Source creation time, when parseable. |
| `first_inspection_at` | service request | Earliest directly linked inspection source event. |
| `first_work_order_at` | service request | Earliest work order through a direct inspection link. |
| `event_observed` / `is_censored` | survival row | Whether an endpoint was observed by `observation_end`. |
| `current_age_hours` | open request | Observation-time age, not a completion duration. |
| `history_origin` | survival row | `source_event` for supported source times; `tree11_observation` otherwise. |
