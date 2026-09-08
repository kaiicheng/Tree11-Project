# Adaptive Socrata ingestion implementation note

Audit completed 2026-09-06 before implementation:

- `SocrataClient.rows` uses offset pagination and a single global 50,000-row limit. It advances the offset by the accepted response length and terminates on an empty or partial page.
- Every configured source already supplies explicit two-column ordering. Service requests, inspections, and work orders use `updateddate,globalid`; risk assessments use `createddate,globalid`. `globalid` is the required unique tie-breaker.
- Requests have a 30-second timeout and at most four attempts. Timeouts, connection errors, 429s, and 5xx responses retry with exponential bounded backoff; other 4xx responses fail immediately. A timeout currently retries the same oversized request.
- The 20-minute source deadline is checked between pages, but not before retry sleeps or against the next request timeout. The two-million-row ceiling is checked before accepting a page.
- Exact repeated pages are detected by canonical response hashes. There is no monotonic-order validation or cross-page primary-key overlap check in the HTTP layer; duplicate IDs are only rejected after the entire source is downloaded.
- JSON progress events cover request/page/source lifecycle, but omit request latency, throughput, adaptive sizing, retry totals, and timeout totals. Manifest source metadata only contains rows, duration, and status.
- Fetches cannot resume after process termination. Canonical output is written only after a complete source fetch, and public assets are atomically published only after all sources, transforms, and validation succeed.
- The configured datasets expose a stable timestamp plus `globalid` ordering pair according to the existing schema audit. Although a SoQL keyset predicate is technically possible, mutable timestamp fields can move during a full scan and lexical/null semantics need dataset-specific proof. This milestone therefore keeps deterministic offset pagination and strengthens its validation; keyset remains a documented follow-up rather than an unsafe default.

Implementation direction: add per-source validated pagination configuration, a deterministic conservative page-size controller, classified bounded retries that shrink only on timeouts, deadline-aware requests/backoff, page and cross-page correctness checks, compact aggregate metadata, and a non-publishing bounded probe command. Checkpoint/resume is deferred until checkpoint identity and mutation consistency can be designed without weakening atomic publication.

## Lifecycle sequential fixture hardening (2026-09-06)

The deterministic A → B → B → C → D fixture run retained four snapshots. It
produced 6 current entities, 16 semantic events, 7 `ADDED` deltas, 4 `CHANGED`
deltas, 8 recorded `UNCHANGED` observations, and one
`REMOVED_FROM_CURRENT_SOURCE` / `SOURCE_RECORD_DISAPPEARED` observation. The
final graph contains four direct relationships, one censored open request, and
three status transitions (`Open → In Progress`, `In Progress → Closed`, and
`Pending → Complete`). Median request-to-inspection, request-to-work-order, and
work-order-to-completion timings were 36, 66, and 24 hours respectively.

The retained compact source snapshots measured 830–1,046 bytes each; lifecycle
delta snapshots measured 2,025–4,841 bytes each (the size follows the changed
entity fields/events rather than embedding raw source rows). Aggregate history
artifacts were 173–884 bytes. B replay created no new snapshot, deltas, or
events. The integration test also proves state as of B remains Open after C/D,
and a validation failure after staging leaves both current assets and retained
lifecycle history untouched.
