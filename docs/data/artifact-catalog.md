# Static artifact catalog

| Path | Version | Consumer | Scope |
| --- | --- | --- | --- |
| `public/data/research/overview.json` | 1 | `/analysis` | Counts, timing distributions, censoring disclosure. |
| `public/data/research/backlog.json` | 1 | `/analysis` | Current open backlog and aging only. |
| `public/data/research/lifecycle_funnel.json` | 1 | `/analysis` | Directly linked lifecycle funnel. |
| `public/data/research/cohorts.json` | 1 | `/analysis` | Cohort horizons and eligibility. |
| `public/data/research/geography.json` | 1 | `/analysis` | Validated administrative geography, with suppression. |
| `public/data/quality/*.json` | 1 | `/analysis` | Refresh-quality snapshot and retained trend. |

These files are a static API. Consumers must check `schema_version` and treat nullable/suppressed values as unavailable, never zero.
