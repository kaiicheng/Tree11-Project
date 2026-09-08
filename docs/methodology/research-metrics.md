# Research metrics and disclosure

Research artifacts in `public/data/research/` are versioned static contracts. `metric_contracts.json` defines units, grains, timestamps, denominators, and censoring policy. Durations use source event timestamps and exclude right-censored cases from completed-duration distributions. `current_age_hours` is calculated only for open records at the accepted observation time and is never a completion duration.

`source_event` history is directly represented by source timestamps. `tree11_observation` history comes from accepted retained snapshots. Cohort outcomes are null before their horizon is fully observed. Geographic distributions below the configured minimum group size are suppressed rather than reported as zero.
