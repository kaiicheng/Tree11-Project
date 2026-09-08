# Socrata pagination

## Recommendation

Tree11 uses adaptive, deterministic offset pagination. It is a better fit than the former fixed 50,000-row requests because it targets dependable request latency and can safely retry the same offset with a smaller limit. It is currently safer than keyset pagination for these mutable full-refresh datasets: a record's timestamp can change while a scan is running, and compatible null and lexical ordering semantics have not yet been proven for every source.

| Strategy | Latency and retries | Correctness risk | Complexity | Status |
| --- | --- | --- | --- | --- |
| Fixed 50k offset | A service-request page took about 29.4s and the next timed out | Stable only with explicit ordering | Low | Replaced |
| Adaptive offset | Targets 12s; shrinks by half on timeout | Concurrent source mutation can still shift offsets | Moderate | Production default |
| SoQL keyset | Potentially efficient at high offsets | Mutable/null cursor semantics could skip or duplicate rows | High, dataset-specific | Deferred pending live schema/consistency proof |

## Adaptive policy

Each source has an independent `PageSizeConfig`. The default range is 1,000–50,000 rows, initially 10,000; `service_requests` is configured for 2,000–30,000, initially 10,000. A full page at no more than half the 12-second target grows by 25%. A page at or above 125% of target shrinks by 30%. Other successes hold steady. A timeout halves the size before retrying the same offset. Bounds are always enforced, and exhausting retries at the minimum is a clear failure.

## Ordering and acceptance

All queries explicitly order by a source timestamp followed by unique `globalid`. Service requests, inspections, and work orders use `updateddate,globalid`; risk assessments use `createddate,globalid`. Configuration without a primary-key tie-breaker fails immediately. Socrata omits null fields in JSON; live probing confirmed null timestamps exist, so validation models Socrata's ascending null-last bucket explicitly and still requires `globalid` to order ties. This is another reason timestamp keysets are not enabled.

A page is accepted only after HTTP success, JSON/schema validation, row-limit validation, monotonic ordering validation, repeated-page detection, and primary-key duplicate/overlap checks. Pagination advances by the accepted row count only. Empty pages and partial pages terminate the scan according to Socrata limit/offset semantics. Evidence of overlap or regression is never silently deduplicated.

## Retry and failure behavior

| Failure | Action |
| --- | --- |
| Timeout | Bounded retry at half page size; fail after attempt exhaustion |
| Connection error | Bounded retry at the same size |
| HTTP 429 | Bounded retry at the same size; honor `Retry-After` |
| HTTP 5xx | Bounded retry at the same size |
| Other HTTP 4xx | Fail immediately |
| Malformed JSON or page schema | Bounded retry at the same size |
| Repeated page, cross-page overlap, ordering regression | Fail immediately after response acceptance checks |
| Source deadline or row ceiling | Fail immediately |

Backoff is capped at 20 seconds. The client will not start another attempt with one second or less remaining in the 20-minute source budget, will cap the request timeout to the remaining budget, and will not sleep past the budget. Adaptive sizing improves reliability; it cannot guarantee that Socrata is available or that a highly mutable offset scan is a transactionally consistent snapshot.

## Observability and safety

`dataset_page_complete` JSON events include source, page, offset, requested page size, returned rows, page duration, rows/second, page retry count, and next page size. Per-source manifest metadata keeps only aggregate fields: strategy, initial/minimum/maximum/final sizes, pages, retries, timeouts, rows, total duration, average throughput, and observed duration bounds. These fields are additive within format version 2, so v1/v2 readers remain supported.

Use `python -m tree11_pipeline.cli probe --source service_requests --pages 3 --max-rows 30000` for a bounded live diagnostic. Probe collects rows only in memory and never writes canonical or published assets. Full builds retain the existing atomic publication boundary: any source or validation failure leaves `public/data` unchanged.

Checkpoint/resume is intentionally deferred. A safe implementation must bind accepted page hashes and pagination state to the exact source ID, query, ordering, schema, and configuration, then revalidate all checkpoint content without weakening atomic publication.
