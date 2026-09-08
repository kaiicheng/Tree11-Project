# Lifecycle model audit

The four source tables are source-grain records keyed by `globalid`: service requests, inspections, work orders, and risk assessments. Their canonical grain remains one source record per `globalid`.

Direct relationships are service request `globalid` → inspection `servicerequestglobalid`, and inspection `globalid` → work order/risk assessment `inspectionglobalid`. These are safe direct links; no fuzzy or request-to-work-order shortcut is used. Missing parent IDs are retained as orphans. One request can have many inspections and downstream records.

Temporal fields: requests expose `createddate`, `initiateddate`, `closeddate`, and `updateddate`; inspections expose `inspectiondate`, `createddate`, `closeddate`, and `updateddate`; work orders expose `createddate`, `actualfinishdate`, `closeddate`, `canceldate`, and `updateddate`; risks currently expose only `createddate`. Status fields vary (`srstatus`, `wostatus`, or `status`) and are mutable. No universal status-transition timestamp exists.

Therefore a source update is not silently treated as a business event. Lifecycle records preserve event/business time when present, `source_updated_at`, and pipeline observation (`retrieved_at`). Risk completion and many work-order creation/status semantics remain source-limited. Source revisions and disappearing records create survivorship/revision risk; disappearance is an observation, not deletion or closure.

Implementation uses normalized state deltas, deterministic hashes, direct relationship rows, replayable as-of state, and deduplicated events. It does not claim observation history before Tree11 began retaining snapshots.
