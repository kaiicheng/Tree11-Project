import shutil
from pathlib import Path

from tree11_pipeline.config import Settings
from tree11_pipeline import ingest


def test_probe_never_writes_canonical_or_public_assets(monkeypatch):
    class FakeClient:
        def __init__(self, *args, **kwargs): self.last_stats = None
        def rows(self, *args, **kwargs):
            self.last_stats = {"pages_fetched": 1, "total_rows": 1, "retry_count": 0,
                               "timeout_count": 0, "final_page_size": 10000}
            return iter([{"globalid":"x","updateddate":"2026-01-01T00:00:00.000"}])
    root = Path(__file__).parent / ".test-probe"
    shutil.rmtree(root, ignore_errors=True)
    try:
        monkeypatch.setattr(ingest, "SocrataClient", FakeClient)
        stats = ingest.probe_source(Settings(root), "service_requests", 1, 1)
        assert stats["probe"] is True and stats["rows"] == 1
        assert not (root / "data" / "canonical").exists()
        assert not (root / "public" / "data").exists()
    finally:
        shutil.rmtree(root, ignore_errors=True)
