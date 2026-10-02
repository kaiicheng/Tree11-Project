import assert from "node:assert/strict";
import test from "node:test";
import { nextBusXmlToFeatures } from "../pages/api/rioc-vehicles.js";

test("RIOC NextBus conversion creates valid Red Bus vehicle features", () => {
  const xml = `<?xml version="1.0"?><body>
    <vehicle id="11" routeTag="shuttle" dirTag="n" lat="40.757768" lon="-73.954858" secsSinceReport="5" predictable="true" heading="55" speedKmHr="13"/>
    <vehicle id="bad" routeTag="shuttle" lat="200" lon="-73.9" secsSinceReport="1"/>
  </body>`;
  const features = nextBusXmlToFeatures(xml, "shuttle", new Date("2026-10-02T04:00:10.000Z"));
  assert.equal(features.length, 1);
  assert.equal(features[0].id, "rioc-11");
  assert.deepEqual(features[0].geometry.coordinates, [-73.954858, 40.757768]);
  assert.equal(features[0].properties.route_name, "Red Bus");
  assert.equal(features[0].properties.direction, "Northbound");
  assert.equal(features[0].properties.updated_at, "2026-10-02T04:00:05.000Z");
});
