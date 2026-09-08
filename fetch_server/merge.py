"""Merge timestamped ingestion GeoJSON files without ingesting the output."""
import glob
import os
from pathlib import Path
import geojson

def merge_geojson_files(directory="."):
    directory = Path(directory).resolve()
    output = directory / "tree11_collection.geojson"
    files = [Path(path) for path in glob.glob(str(directory / "*.geojson"))
             if Path(path).resolve() != output]
    files.sort()
    result = {"features": [], "type": "FeatureCollection"}
    for path in files:
        with path.open(encoding="utf-8") as source:
            dataset = geojson.load(source)
        result["features"].extend(dataset.features)
    temporary = output.with_suffix(output.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as target:
        geojson.dump(result, target)
    os.replace(temporary, output)
    return output

if __name__ == "__main__":
    merge_geojson_files()
