# Urban operations research audit

## Current architecture

Socrata source tables are ingested deterministically into canonical JSONL, transformed at source grain, and atomically published as compact static assets. Accepted snapshots produce replayable lifecycle state deltas and deterministic events. The browser consumes generated JSON rather than raw source exports.

## Grains and lifecycle semantics

Service requests, inspections, work orders, and risk assessments are each one row per source `globalid`. Direct source IDs establish request→inspection and inspection→work-order/risk relationships. Source event times, source update times, and Tree11 observation times are separate. A missing endpoint is right-censored, not completed; source disappearance is not closure.

## Existing and new research capability

The system already supported as-of entity replay, lifecycle event history, relationship checks, and selected timing summaries. The research layer now adds explicit versioned metric contracts, timing distributions, censoring-aware survival rows, funnels, backlog/aging, cohorts with eligibility, geographic aggregates, compact quality trends, research-run manifests, and static browser artifacts.

## Limitations and caveats

History begins at retained Tree11 observations and cannot establish pre-retention daily backlog. Source status semantics determine “open”; no unsupported closure or intermediate event is inferred. Relationship gaps and invalid coordinates are source-quality limitations. Descriptive differences are not causal effects. Small geographic groups suppress distributions. Historical as-of research intentionally does not read current canonical data, preventing future leakage, but therefore has limited source-category/geography detail unless retained in historical state.

## Implementation sequence and non-goals

Implemented sequence: lifecycle replay → research tables → compact artifacts → validation/publication → static analysis page → reproducible runs. Non-goals are databases, external geocoding, ML, causal claims, and reconstruction of source events not present in source timestamps.
