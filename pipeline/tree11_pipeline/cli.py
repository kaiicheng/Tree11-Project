import argparse, json, os, time
from datetime import datetime, timezone
from pathlib import Path
from .config import Settings
from .ingest import fetch_all, probe_source, read_canonical, write_canonical
from .transform import build_model
from .publish import publish
from .validate import validate_assets
from .lifecycle import replay, relationships, analytics
from .research.artifacts import build_research, write_research_run

def root():
    """Return the workspace root, with an override for isolated CI builds."""
    return Path(os.getenv("TREE11_ROOT", Path(__file__).resolve().parents[2]))
def fixture_tables(settings, snapshot=None):
    raw=Path(__file__).parents[1]/"tests"/"fixtures"/("lifecycle_snapshots.json" if snapshot else "tables.json")
    tables=json.loads(raw.read_text())
    if snapshot: tables=tables[snapshot]
    for n, rows in tables.items(): write_canonical(rows,n,settings.canonical_dir)
    return tables
def main(argv=None):
    p=argparse.ArgumentParser(); p.add_argument("command",choices=["build","validate","validate-history","history-summary","status","fetch","probe","research"]); p.add_argument("--fixture",action="store_true"); p.add_argument("--fixture-snapshot",choices=list("ABCD")); p.add_argument("--full",action="store_true"); p.add_argument("--as-of")
    p.add_argument("--source", default="service_requests"); p.add_argument("--pages", type=int, default=3); p.add_argument("--max-rows", type=int, default=30_000)
    a=p.parse_args(argv); settings=Settings(root())
    if a.command in ("validate","validate-history"): validate_assets(settings.public_dir,settings.max_map_bytes); print("valid"); return
    if a.command=="history-summary":
        manifest=json.loads((settings.public_dir/"manifest.json").read_text()); print(json.dumps(manifest.get("history",{}),sort_keys=True)); return
    if a.command=="status": print((settings.public_dir/"manifest.json").read_text()); return
    if a.command=="probe":
        if a.pages <= 0 or a.max_rows <= 0: p.error("--pages and --max-rows must be positive")
        print(json.dumps(probe_source(settings,a.source,a.pages,a.max_rows),sort_keys=True)); return
    if a.command == "research":
        public=settings.public_dir; life=[]
        for file in sorted((public/"history"/"lifecycle"/"snapshots").glob("*.json")): life.append(json.loads(file.read_text()))
        if not life: p.error("no accepted lifecycle snapshots; run build first")
        if a.as_of and not any(s.get("snapshot_id")==a.as_of or s.get("observed_at")==a.as_of for s in life): p.error("--as-of must name a retained snapshot ID or observation timestamp")
        cutoff=next((s["observed_at"] for s in life if s.get("snapshot_id")==a.as_of),a.as_of)
        entities=list(replay(life,cutoff).values()); rows,_,_,_=analytics(entities,relationships(entities),[],cutoff or life[-1]["observed_at"])
        # Current canonical tables are only used for current-state runs; historical runs intentionally avoid them to prevent future leakage.
        tables=read_canonical(settings.canonical_dir) if not cutoff else {"service_requests":[],"inspections":[],"work_orders":[],"risk_assessments":[]}
        research=build_research(tables,rows,cutoff or life[-1]["observed_at"],life)
        run=write_research_run(settings.root,research,[s["snapshot_id"] for s in life if not cutoff or s["observed_at"]<=cutoff],{"as_of":cutoff,"minimum_group_n":5,"age_buckets_days":[7,30,90,180]})
        print(f"research run {run}"); return
    started = datetime.now(timezone.utc).isoformat(); timer = time.monotonic()
    metadata = {"started_at": started, "status": "success", "sources": {}}
    provenance = settings.canonical_dir / "provenance.json"
    if a.fixture or a.command == "fetch" or a.full:
        # A partial replacement must not inherit the previous dataset's label.
        provenance.unlink(missing_ok=True)
    if a.fixture:
        tables = fixture_tables(settings,a.fixture_snapshot)
        metadata["data_mode"] = "fixture"
        provenance.write_text(json.dumps({"data_mode": "fixture"}))
        metadata["sources"] = {name:{"rows":len(rows),"duration_seconds":0,"status":"success"} for name, rows in tables.items()}
    elif a.command in ("fetch",) or a.full or (a.command == "build" and
            (not settings.canonical_dir.exists() or
             (provenance.exists() and json.loads(provenance.read_text()).get("data_mode") == "live"))):
        tables, metadata["sources"] = fetch_all(settings, return_metadata=True, full=a.full)
        metadata["data_mode"] = "live"
        provenance.write_text(json.dumps({"data_mode": "live"}))
    else:
        tables = read_canonical(settings.canonical_dir)
        metadata["data_mode"] = json.loads(provenance.read_text()).get("data_mode", "unknown") if provenance.exists() else "unknown"
        metadata["sources"] = {name:{"rows":len(rows),"duration_seconds":0,"status":"cached"} for name, rows in tables.items()}
    metadata.update({"ended_at": datetime.now(timezone.utc).isoformat(), "duration_seconds":round(time.monotonic()-timer,3)})
    if a.command=="fetch": print("canonical source tables refreshed"); return
    observed={"A":"2026-01-01T00:00:00+00:00","B":"2026-01-02T00:00:00+00:00","C":"2026-01-03T00:00:00+00:00","D":"2026-01-04T00:00:00+00:00"}.get(a.fixture_snapshot)
    publish(build_model(tables,observed) if observed else build_model(tables),settings.public_dir,tables,settings.max_map_bytes,settings.snapshot_retention,metadata); print(f"published {settings.public_dir}")
if __name__ == "__main__": main()
