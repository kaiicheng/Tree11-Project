# Tree11 baseline audit

Audit date: 2026-09-05 (updated after the first repair cycle)  
Branch: `chore/phase-1-baseline`  
Baseline commit: `904760f6`

## Executive assessment

Tree11 is a deployable 2022 research prototype, not a live data product. Its production build succeeds and its five primary public pages are present. Dashboard statistics are static, however, and the experimental refresh pipeline cannot reliably advance its checkpoint or retrieve complete result sets. The first repair cycle removed the browser's misleading static-data refresh timer while leaving pipeline modernization for a later phase.

The safest path is to preserve the current UI while restoring security and correctness, then modernize the framework and data pipeline in separate reviewed phases.

## Architecture and data flow

```text
NYC Open Data (four Socrata datasets)
        |
        | experimental/manual Python and notebooks
        v
CSV / JSON / GeoJSON snapshots in data/ and public/
        |
        +----------------------+----------------------+
        |                      |                      |
data/dataCharts.js      public/data/*.csv   public/*.geojson
        |                      |                      |
        v                      v                      v
Chart.js pages       PapaParse metric charts     Mapbox GL map
        \______________________|______________________/
                               |
                        Next.js Pages Router
                               |
                        Vercel / tree11.org
```

There is no configured scheduler, database, object store, or pipeline publication step. The two API routes package local snapshots; the visible map reads public GeoJSON directly.

## Pages and major components

| Area | Purpose | Status |
| --- | --- | --- |
| `/` | Map, request-to-action percentage, counts, and request-source chart | Renders; statistics are hard-coded and historical |
| `/intro` | Research purpose, source links, credits, and contact | Renders; claims and contacts need owner review |
| `/metrics` | Service Request, Inspection, and Work Order tabs | Partial; Inspections is a text placeholder |
| `/deepdive` | Narrative, map, Work Order, and request-source charts | Renders; very large client bundle and historical data |
| `/get-involved` | Reporting and NYC Parks resource links | Renders; includes unused/generated chart code |
| `/nav` | Earlier navigation/design page linking to `/home` | Obsolete or experimental; `/home` does not exist |
| `components/map/map.js` | Map, borough toggles, and feature popups | Has correctness, lifecycle, security, and scale defects |
| Chart components | Static and CSV-backed Chart.js views | Duplicated parsing, random colors, weak error handling |
| `/api/data` | Returns a bundled, roughly 10 MB GeoJSON snapshot | Present but unused by the visible map |
| `/api/demo` | Returns demo JSON | Appears experimental and unused |

## Source data and pipeline

The Python script requests Service Requests, Inspections, Work Orders, and Risk Assessments from NYC Open Data, selects columns, joins through source IDs, and writes GeoJSON. `merge.py` concatenates GeoJSON files in its working directory. Notebooks separately produce CSV and chart exports. No reproducible Python dependency manifest exists.

The deployed client uses three independent snapshot paths:

1. Hard-coded aggregates in `data/dataCharts.js`.
2. CSV files in `public/data`, parsed in the browser.
3. `public/tree11_collection.geojson`, now filtered only for valid Point geometry and displayed in full (1,063 records in the checked snapshot).

Known pipeline defects:

- `last_fetch_date.txt` is opened with `w+`, truncating it before reading.
- Socrata requests use `$limit=1000` without deterministic pagination.
- HTTP calls have no timeout, retry, app token, or explicit status handling.
- Empty Service Request results stop the run even if related datasets changed.
- Schema selection fails without a useful schema-drift diagnostic.
- Work Order locations are dereferenced without first excluding nulls.
- Joins can multiply records; uniqueness and join coverage are not tested.
- Missing values are mixed with `N/A` strings and numeric zero.
- Output names depend on an unreliable checkpoint value.
- `merge.py` can re-ingest merged output and does not deduplicate.
- There is no atomic publication, version metadata, rollback, quality gate, or schedule.

## Deployment assumptions

The README, Git remote, old Vercel URL, and matching production content strongly indicate that this repository backs `tree11.org`. The repository cannot confirm the Vercel project ID, Git integration, production branch, Node runtime, environment settings, domain ownership, or automatic deployment status. Check those in Vercel before release.

## Baseline functional findings

Complete enough for the baseline:

- Five main routes render in a production build.
- Static Chart.js charts compile.
- Historical GeoJSON and CSV assets are present.
- The visual brand and research narrative are consistent.
- Source dataset and public-action links are present.

Incomplete, broken, or obsolete:

- The Inspections metrics tab is a placeholder.
- The map interval updates `311DataFresh`; the actual source is `311-data`.
- That interval rereads the same asset and cannot make data fresher.
- The map silently takes only the first 2,400 features.
- Map initialization has no unmount cleanup for the map, timer, or controls.
- CSV readers call `reader.read()` only once and may parse only the first chunk.
- Chart colors use randomness and can calculate invalid color channels.
- Loading, error, empty, and stale states are absent or incomplete.
- `/nav` links to nonexistent `/home`.
- API routes and several chart components appear unused.
- Comments say 30-minute refresh while code waits 24 hours.

## Security and privacy

- The baseline `npm audit` reported 16 vulnerable packages: 5 moderate, 10 high, and 1 critical. Staged upgrades through Next.js 12, 13, 14, 15, and 16 removed every current production finding. The final production audit reports zero vulnerabilities. The complete development tree retains two high transitive findings in ESLint's dependency graph.
- Map popup content is constructed with `setHTML()` from external property values, creating an injection boundary.
- A legacy public Mapbox token and third-party style owner are embedded in source. Browser tokens are visible by design, but this should be environment-backed, URL-restricted, minimally scoped, and project-owned.
- There is no Content Security Policy or documented security-header policy.
- Published location and request fields need a minimization review before refreshed data is released.
- Local environment files were not previously ignored.

## Accessibility

- The map lacks an accessible data alternative and keyboard-oriented exploration.
- Generated borough controls lack a group label and robust state announcement.
- Metric tabs lack tab roles, keyboard movement, and associated panels.
- Focus behavior and visible focus styling need review.
- Charts need text summaries or accessible tables.
- Category colors need contrast checks and non-color cues.
- Titles and heading hierarchy need a route-by-route audit.
- No automated accessibility or browser tests exist.

## Performance

- Baseline first-load JavaScript: `/` 413 kB, `/get-involved` 689 kB, `/deepdive` 954 kB.
- Mapbox and chart dependencies load eagerly on applicable pages.
- Approximately 10 MB GeoJSON snapshots exist in both `data` and `public`; another public map file is about 1.6 MB.
- `/api/data` bundles a roughly 10 MB GeoJSON file into an unused function.
- The working tree is about 217 MB across 106 files; Git pack storage is about 224 MB.
- Two tracked 2022 CSV copies are roughly 70 MB each. ZIP, GeoJSON, notebook output, and checkpoint files are also tracked.
- Google Fonts was unavailable during the baseline build, making optimization dependent on an external service.

## SEO and content

- Basic shared titles/descriptions exist; canonical URLs, Open Graph data, sitemap, robots policy, and social image metadata do not.
- Historical values are labeled “current” and “last month” without coverage dates.
- Copy has capitalization, encoding, spelling, and grammar defects.
- Data-status and methodology pages are absent.
- There is no branded 404/500 experience.

## Maintainability

- The baseline Next.js 12 and `next lint` toolchain was obsolete. It has been replaced by Next.js 16.3.4 and the ESLint 9 CLI.
- The app is untyped JavaScript with no domain models or runtime validation.
- Navigation markup is duplicated across pages.
- CSV transformation logic is duplicated across chart components.
- Faker-generated chart code and its deprecated type stub have been removed.
- D3 was unused by the Next.js application and has been removed from its dependencies; archived standalone D3 experiments remain in `plotD3/`.
- The baseline had no tests, CI, ownership file, or release checklist.
- Python has no dependency manifest or supported pipeline command.

## Large and duplicate files

| File or group | Approximate size / issue |
| --- | --- |
| `data/joint_public_data_2022.csv` | 70 MB |
| `notebooks/joint_public_data_2022.csv` | Duplicate 70 MB snapshot |
| `data/map-tree11.geojson.zip` | 21 MB |
| `data/joint_public_data_2022.zip` | 13 MB |
| `data/num-tree11.geojson.zip` | 11 MB |
| `data/num-tree11-api.geojson` | 10 MB |
| `public/num-tree11-api.geojson` | Duplicate 10 MB browser asset |
| Notebook checkpoints and outputs | Generated files in multiple directories |

Removal and history rewriting are outside Phase 1. A later phase must first identify canonical sources and generated outputs. Historical pack cleanup should be separately approved because it rewrites Git history.

## Baseline commands and results

Environment: Node.js 22.14.0, npm 11.1.0, Git 2.47.1.windows.2.

| Command | Result before Phase 1 configuration |
| --- | --- |
| `npm ci` | Passed; 308 packages; 16 vulnerabilities |
| `npm run build` | Passed; warned about Browserslist, Google Font download, and webpack cache snapshots |
| `CI=1 npm run lint` | Did not lint; opened first-run configuration prompt |
| `npm audit --json` | Completed; exit 1 due to 16 findings |
| `npm audit --omit=dev --json` | Baseline: 7 production findings (1 moderate, 5 high, 1 critical) |
| `npm outdated --json` | Completed; dependencies are outdated |

The build also printed `[]` during static generation because application code logs chart state during render.

Results after adding the Phase 1 non-interactive ESLint baseline:

| Command | Result |
| --- | --- |
| `npm run lint` | Failed with one pre-existing Rules of Hooks error and four Hook dependency warnings |
| `npm run build` | Failed because Next.js runs the same ESLint rules during build |
| `git diff --check` | Passed; only line-ending conversion notices were emitted by Git on Windows |

The initial blocker was the conditional `useEffect` call in `components/charts/MetricStackedBarChart.js`, with dependency warnings in four chart components. These findings had been hidden because the repository lacked ESLint configuration. The first repair cycle corrected the Hook lifecycle and CSV loading rather than suppressing rules; lint and build now pass.

## Dependency upgrade risk

The framework was upgraded and verified at 12.3.7, 13.5.11, 14.2.35, 15.5.25, and finally 16.3.4. React and React DOM are now 19.2.8. The Pages Router was retained to isolate framework maintenance from a routing rewrite.

Chart.js is now 4.5.1, react-chartjs-2 is 5.3.1, Mapbox GL is 3.30.0, ESLint is 9.39.2, Sass is 1.104.0, and PapaParse is 5.7.0. The remaining upgrade risk is visual/browser behavior, so the next test investment should be Playwright coverage for map and chart interactions.

Node 22.14.0 is pinned because it completed this legacy baseline build. Re-evaluate Node 24 with the supported Next.js target instead of changing runtime and framework together.

## Plan and acceptance criteria

### Phase 1 — reproducible baseline

Deliver Node pinning, an environment template, non-interactive lint configuration, PR CI, current documentation, and this audit.

Acceptance status: passed. Locked install succeeds; lint runs without prompting; build succeeds; CI runs install/lint/optional tests/build; secrets are ignored and documented; security findings and missing tests remain visible.

### Phase 2 — repair behavior

Fix map lifecycle/source/safety defects, robust CSV loading and states, deterministic charts, Inspections metrics, copy, responsive navigation, and core accessibility.

Acceptance: map paths run without console errors or leaks; no external value enters raw HTML; every data view has loading/error/empty/coverage states; all metric tabs contain real documented values; keyboard users can reach navigation, filters, tabs, and a map-equivalent view; checks pass.

Progress in the first repair cycle:

- Fixed the conditional Hook blocker and all Hook dependency warnings.
- Changed CSV charts to read complete responses, check HTTP status, cancel requests on unmount, and expose loading/error states.
- Replaced random chart colors with a deterministic palette.
- Connected the Inspections tab to the existing historical monthly risk data.
- Added tab semantics to the Metrics controls.
- Rebuilt map initialization with request cancellation and map cleanup.
- Removed the false 24-hour refresh and invalid `311DataFresh` source reference.
- Removed the unexplained 2,400-record limit; the checked snapshot contains 1,063 valid records.
- Replaced raw popup HTML interpolation with DOM nodes populated through `textContent`.
- Replaced manually appended borough controls with labeled, focusable React checkboxes.
- Added map loading, error, and historical-record-count states.

Remaining Phase 2 work includes a non-map accessible data view, richer empty/stale states, keyboard arrow behavior for tabs, page-wide mobile/accessibility review, copy corrections, and replacing the legacy Mapbox token after the owner configures the Vercel environment.

### Phase 3 — supported web stack

Upgrade framework dependencies major by major, introduce TypeScript and boundary validation, remove unused packages, consolidate charts, add tests, improve metadata, and lazy-load heavy code.

Acceptance: supported Next.js/React/Node with no critical/high production advisories; domain and GeoJSON boundaries typed/validated; URLs preserved; CI has meaningful unit and smoke tests; bundles measured and materially reduced.

Progress:

- Upgraded major versions sequentially through Next.js 16.3.4 and React 19.2.8, validating each framework checkpoint.
- Migrated from deprecated `next lint` to ESLint 9 flat configuration and the ESLint CLI.
- Upgraded Chart.js, react-chartjs-2, Mapbox GL, PapaParse, and Sass.
- Removed unused Faker, its type stub, D3, and `json-loader` dependencies.
- Removed dead chart code from Get Involved and fake fallback data from the shared line chart.
- Replaced the GeoJSON webpack import in `/api/data` with runtime reading of the public snapshot.
- Reduced first-load JavaScript for `/get-involved` from about 725 kB to 88 kB and `/deepdive` from about 988 kB to 415 kB at the comparable Next.js 15 checkpoint.
- Confirmed zero production dependency vulnerabilities after the Mapbox upgrade.

Remaining Phase 3 work: incremental TypeScript/domain types, runtime boundary validation, meaningful automated tests, browser accessibility checks, and metadata/SEO improvements.

### Phase 4 — reliable pipeline

Create a reproducible, paginated, idempotent, validated pipeline with versioned outputs and atomic publication.

Acceptance: unchanged reruns are equivalent and duplicate-free; deterministic pagination retrieves the selected window; schema/uniqueness/range/null/join/category/change tests run; failed checks preserve the last good version; outputs contain provenance and quality metadata; browser assets are minimized.

### Phase 5 — automated updates

Schedule the pipeline, publish only validated artifacts, expose freshness, isolate previews, and document recovery.

Acceptance: daily and manual runs share one idempotent workflow; concurrent invocations cannot corrupt publication; logs and failures are visible; publication is atomic and reversible; the site displays coverage and sync time.

### Phase 6 — product expansion

Add shareable filters, search, clustered/heat maps, accessible tables/downloads, lifecycle timelines, response distributions, documented rates, geographic comparisons, and mobile improvements.

Acceptance: filter URLs are reproducible and totals match across views; every rate defines numerator/denominator/coverage/exclusions; geographic comparisons include appropriate context; core workflows pass accessibility and mobile tests; methodology and status are understandable without reading code.

## Owner decisions and external checks

Before Phase 2 or deployment, confirm:

1. Vercel project, production branch, Node runtime, Git integration, and domain mapping.
2. Mapbox account/style ownership and whether to retain Mapbox or adopt MapLibre.
3. Whether contacts and collaborator credits are current.
4. Intended coverage and definitions for each metric.
5. Publication location for generated assets.
6. Whether `/nav`, demo APIs, and research artifacts must remain public.

No push, deployment, DNS change, production-data deletion, dependency upgrade, or Git-history rewrite was performed in Phase 1.
