import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const EXPECTED_ROUTES = [
  "1", "2", "3", "4", "5", "6", "7",
  "A", "B", "C", "D", "E", "F", "FS", "G", "GS", "H",
  "J", "L", "M", "N", "Q", "R", "W", "Z",
];

test("static subway route geometry covers every NYC Subway route group", () => {
  const file = path.join(process.cwd(), "public", "data", "transit", "subway-routes.geojson");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(data.type, "FeatureCollection");
  assert.ok(data.features.length > EXPECTED_ROUTES.length);

  const routes = [...new Set(data.features.map((feature: { properties: { route_id: string } }) => feature.properties.route_id))].sort();
  assert.deepEqual(routes, [...EXPECTED_ROUTES].sort());
  for (const feature of data.features) {
    assert.equal(feature.geometry.type, "LineString");
    assert.ok(feature.geometry.coordinates.length >= 2);
    assert.ok(feature.geometry.coordinates.every((coordinate: unknown[]) => coordinate.length === 2));
  }
});
