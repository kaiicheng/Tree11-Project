# Tree11 data pipeline

`tree11-pipeline build --full` fetches the configured analysis window (records created since 2022 by default) from the four NYC Open Data sources, stages source-grain canonical JSONL (and Parquet when the optional dependency is installed), generates small browser assets, validates them, then atomically swaps `public/data`.

For a reproducible local demo without network access:

```sh
python -m pip install -e ./pipeline[dev]
python -m tree11_pipeline.cli build --fixture
python -m tree11_pipeline.cli validate
```

Canonical tables retain `globalid` and relationship keys. The map is intentionally one feature per service request; inspection/work-order/risk values are aggregates rather than a multiplication-prone flattened join. The initial production refresh is full-refresh for mutable operational data. `4pt5-3vv4` remains the inspections source until the possible `h2wd-pfdx` migration can be assessed against its live schema.

Incremental mode is intentionally disabled until mutable-record reconciliation is proven. Full refresh is the correctness path; canonical source files are staged as a complete set before replacement, and no independent checkpoint advances before publication succeeds. Set `TREE11_ANALYSIS_START` to change the window.

A live metadata check on 2026-09-06 found that `4pt5-3vv4` is Forestry Inspections and exposes `globalid`, `servicerequestglobalid`, `inspectiondate`, and `updateddate`; `h2wd-pfdx` did not expose those compatible fields. Risk assessments expose `createddate` but not `updateddate`, so their full-refresh ordering is `createddate,globalid`.

Raw/canonical intermediates are ignored by Git. Only validated `public/data` artifacts are committed. `SOCRATA_APP_TOKEN` is optional locally and is read from a GitHub Actions secret for scheduled use.

Live Socrata ingestion uses source-specific adaptive offset pagination, explicit timestamp-plus-`globalid` ordering, bounded classified retries, and cross-page correctness checks. A timeout retries the same offset with a smaller page, and failed ingestion never reaches atomic publication. See [the pagination runbook](../docs/ingestion/socrata-pagination.md).

Run a bounded, non-publishing diagnostic before a full refresh:

```sh
python -m tree11_pipeline.cli probe --source service_requests --pages 3 --max-rows 30000
```
# Lifecycle history

Normal builds also atomically advance compact lifecycle state deltas and public
analytics. Use `python -m tree11_pipeline.cli history-summary` for retained
snapshot/event counts and `validate-history` for artifact validation. Source
event timestamps, source update timestamps, and Tree11 observation timestamps
are distinct; see `docs/methodology/lifecycle-timing.md`.

## Research runs

`python -m tree11_pipeline.cli research` builds a deterministic run from accepted artifacts without fetching. Use `--as-of <retained snapshot id>` to replay only that point in time; the runner deliberately avoids current canonical rows in an as-of run to prevent future leakage. Runs contain a manifest, resolved configuration, compact metrics, a JSONL survival table, and a short methodology report under `data/research_runs/`.
