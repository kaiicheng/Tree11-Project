import json
import shutil
import tempfile
import time
from pathlib import Path
from .config import DATASETS, REQUIRED, SOURCES
from .socrata import SocrataClient
from .validate import validate_source

def write_canonical(rows, name, destination):
    rows = sorted(rows, key=lambda r: str(r["globalid"]))
    validate_source(name, rows, REQUIRED[name])
    destination.mkdir(parents=True, exist_ok=True)
    # JSONL is the dependency-free canonical fallback; parquet is preferred when available.
    (destination / f"{name}.jsonl").write_text("".join(json.dumps(r, sort_keys=True, separators=(",", ":")) + "\n" for r in rows), encoding="utf-8")
    try:
        import pandas as pd
        pd.DataFrame(rows).to_parquet(destination / f"{name}.parquet", index=False)
    except ImportError: pass
    return rows

def fetch_all(settings, return_metadata=False):
    client = SocrataClient(settings.app_token, settings.timeout, settings.retries, settings.max_dataset_seconds, settings.max_source_rows)
    result, sources = {}, {}
    settings.canonical_dir.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix="canonical-build-", dir=settings.canonical_dir.parent))
    try:
      for name, dataset_id in DATASETS.items():
        source = SOURCES[name]
        started = time.monotonic()
        try:
            rows = list(client.rows(dataset_id, order=source.order, page_size=source.page_size,
                                    where=f"createddate >= '{settings.analysis_start}'",
                                    dataset_name=name, primary_key=source.primary_key))
            result[name] = write_canonical(rows, name, staging)
            sources[name] = {**client.last_stats, "rows": len(rows),
                             "duration_seconds": round(time.monotonic()-started, 3), "status": "success"}
            print(json.dumps({"event":"source_written","dataset":name,"rows":len(rows),"elapsed_seconds":round(time.monotonic()-started,3)}, sort_keys=True), flush=True)
        except Exception as exc:
            print(json.dumps({"event":"source_failed","dataset":name,"elapsed_seconds":round(time.monotonic()-started,3),"error":str(exc)}, sort_keys=True), flush=True)
            raise
      previous = settings.canonical_dir.with_name(settings.canonical_dir.name + ".previous")
      if previous.exists(): shutil.rmtree(previous)
      if settings.canonical_dir.exists(): settings.canonical_dir.replace(previous)
      try:
          staging.replace(settings.canonical_dir)
      except Exception:
          if previous.exists() and not settings.canonical_dir.exists(): previous.replace(settings.canonical_dir)
          raise
      if previous.exists(): shutil.rmtree(previous)
    except Exception:
      shutil.rmtree(staging, ignore_errors=True)
      raise
    return (result, sources) if return_metadata else result

def probe_source(settings, name, max_pages=3, max_rows=30_000):
    if name not in SOURCES:
        raise ValueError(f"unknown source: {name}")
    source = SOURCES[name]
    client = SocrataClient(settings.app_token, settings.timeout, settings.retries,
                           settings.max_dataset_seconds, settings.max_source_rows)
    rows = list(client.rows(source.dataset_id, order=source.order, page_size=source.page_size,
                            dataset_name=name, primary_key=source.primary_key,
                            max_pages=max_pages, max_probe_rows=max_rows))
    return {**client.last_stats, "source": name, "probe": True, "rows": len(rows)}

def read_canonical(directory):
    out = {}
    for name in DATASETS:
        path = Path(directory) / f"{name}.jsonl"
        out[name] = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]
    return out
