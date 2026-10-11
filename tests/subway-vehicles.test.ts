import assert from "node:assert/strict";
import test from "node:test";

import { subwayFeedToGeoJson } from "../pages/api/subway-vehicles.js";

const index = {
  stops: {
    "101N": [-74, 40.7, "First Station"],
    "102N": [-73.98, 40.72, "Second Station"],
    "103N": [-73.96, 40.74, "Terminal"],
  },
  patterns: {
    "1..N01R": { stops: ["101N", "102N", "103N"], segment_seconds: [120, 120] },
  },
};

test("subway feed conversion estimates a moving train between stations", () => {
  const feed = {
    header: { timestamp: 1_000 },
    entity: [
      {
        id: "update",
        tripUpdate: {
          trip: { tripId: "090000_1..N99X001", startDate: "20261010", routeId: "1" },
          stopTimeUpdate: [
            { arrival: { time: 1_060 }, stopId: "102N" },
            { arrival: { time: 1_180 }, stopId: "103N" },
          ],
        },
      },
      {
        id: "vehicle",
        vehicle: {
          trip: { tripId: "090000_1..N99X001", startDate: "20261010", routeId: "1" },
          currentStatus: "IN_TRANSIT_TO",
          stopId: "102N",
          timestamp: 1_000,
        },
      },
    ],
  };

  const result = subwayFeedToGeoJson(feed, index, new Date(1_000_000));

  assert.equal(result.features.length, 1);
  assert.ok(Math.abs(result.features[0].geometry.coordinates[0] - -73.99) < 1e-9);
  assert.ok(Math.abs(result.features[0].geometry.coordinates[1] - 40.71) < 1e-9);
  assert.equal(result.features[0].properties.route_id, "1");
  assert.equal(result.features[0].properties.next_stop, "Second Station");
  assert.equal(result.features[0].properties.progress, 50);
  assert.equal(result.features[0].properties.position_type, "Estimated from MTA station times");
});

test("subway feed conversion places stopped trains at the reported station", () => {
  const feed = {
    header: { timestamp: 2_000 },
    entity: [{
      id: "vehicle",
      vehicle: {
        trip: { tripId: "trip", routeId: "1" },
        currentStatus: 1,
        stopId: "102N",
        timestamp: 2_000,
      },
    }],
  };

  const result = subwayFeedToGeoJson(feed, index, new Date(2_000_000));
  assert.deepEqual(result.features[0].geometry.coordinates, [-73.98, 40.72]);
  assert.equal(result.features[0].properties.progress, 100);
});
