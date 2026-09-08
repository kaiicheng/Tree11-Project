import json
from tree11_pipeline import cli


def test_fixture_provenance_survives_cached_build(tmp_path, monkeypatch):
    monkeypatch.setattr(cli, "root", lambda: tmp_path)
    cli.main(["build", "--fixture", "--fixture-snapshot", "D"])
    settings = cli.Settings(tmp_path)
    for name in ("summary", "manifest"):
        assert json.loads((settings.public_dir / f"{name}.json").read_text())["refresh"]["data_mode"] == "fixture"
    cli.main(["build"])
    assert json.loads((settings.public_dir / "manifest.json").read_text())["refresh"]["data_mode"] == "fixture"
    (settings.canonical_dir / "provenance.json").unlink()
    cli.main(["build"])
    assert json.loads((settings.public_dir / "manifest.json").read_text())["refresh"]["data_mode"] == "unknown"
