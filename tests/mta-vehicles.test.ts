import assert from "node:assert/strict";
import test from "node:test";

import { feedToGeoJson } from "../pages/api/mta-vehicles.js";

test("MTA feed conversion keeps valid vehicles and drops invalid positions", () => {
  const generatedAt = "2026-10-02T04:00:00.000Z";
  const feed = {
    entity: [
      {
        id: "entity-1",
        vehicle: {
          trip: { routeId: "M15", tripId: "trip-1" },
          vehicle: { id: "bus-1" },
          position: { latitude: 40.75, longitude: -73.98 },
          timestamp: 1_799_726_400,
        },
      },
      {
        id: "entity-invalid",
        vehicle: { position: { latitude: 200, longitude: -73.9 } },
      },
      { id: "not-a-vehicle" },
    ],
  };

  const result = feedToGeoJson(feed, generatedAt);

  assert.equal(result.type, "FeatureCollection");
  assert.equal(result.generated_at, generatedAt);
  assert.equal(result.features.length, 1);
  assert.deepEqual(result.features[0].geometry.coordinates, [-73.98, 40.75]);
  assert.equal(result.features[0].properties.vehicle_id, "bus-1");
  assert.equal(result.features[0].properties.route_id, "M15");
});
