# Lifecycle history

Accepted builds write compact state deltas to `public/data/history/lifecycle/snapshots`. Replay applies deltas in observation order. Events are deterministic hashes of entity, event, time, and changed values. Raw source payloads are not copied. Current hash snapshots retain the existing configured window; lifecycle deltas are intentionally retained to preserve replay.
