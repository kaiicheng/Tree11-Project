import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const sourceDirectory = process.argv[2];
const outputFile = process.argv[3] || path.join("data", "transit", "subway-index.json");
const routesOutputFile = process.argv[4] || path.join("public", "data", "transit", "subway-routes.geojson");

if (!sourceDirectory) {
  console.error("Usage: node scripts/build-subway-index.mjs <extracted GTFS directory> [index output] [route GeoJSON output]");
  process.exit(1);
}

function readCsv(name) {
  const text = fs.readFileSync(path.join(sourceDirectory, name), "utf8");
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (result.errors.length) throw new Error(`${name}: ${result.errors[0].message}`);
  return result.data;
}

const stops = Object.fromEntries(readCsv("stops.txt").map((stop) => [
  stop.stop_id,
  [Number(stop.stop_lon), Number(stop.stop_lat), stop.stop_name],
]));

const trips = readCsv("trips.txt");
const patternByTrip = new Map();
const routesByShape = new Map();
const normalizeRoute = (routeId) => ({ "6X": "6", "7X": "7", FX: "F" })[routeId] || routeId;
for (const trip of trips) {
  const patternId = trip.trip_id.split("_").at(-1);
  patternByTrip.set(trip.trip_id, patternId);
  const routeId = normalizeRoute(trip.route_id);
  if (routeId !== "SI" && trip.shape_id) {
    if (!routesByShape.has(trip.shape_id)) routesByShape.set(trip.shape_id, new Set());
    routesByShape.get(trip.shape_id).add(routeId);
  }
}

const representativeTrip = new Map();
const patterns = {};
function secondsSinceMidnight(value) {
  const [hours, minutes, seconds] = String(value || "").split(":").map(Number);
  return Number.isFinite(hours + minutes + seconds) ? hours * 3600 + minutes * 60 + seconds : null;
}

for (const stopTime of readCsv("stop_times.txt")) {
  const patternId = patternByTrip.get(stopTime.trip_id);
  if (!patternId) continue;
  if (!representativeTrip.has(patternId)) representativeTrip.set(patternId, stopTime.trip_id);
  if (representativeTrip.get(patternId) !== stopTime.trip_id) continue;
  const pattern = (patterns[patternId] ||= { stops: [], segment_seconds: [] });
  const priorDeparture = pattern.last_departure;
  const arrival = secondsSinceMidnight(stopTime.arrival_time);
  pattern.stops.push(stopTime.stop_id);
  if (pattern.stops.length > 1) {
    const duration = arrival != null && priorDeparture != null ? arrival - priorDeparture : 90;
    pattern.segment_seconds.push(Math.max(30, Math.min(300, duration || 90)));
  }
  pattern.last_departure = secondsSinceMidnight(stopTime.departure_time) ?? arrival;
}

for (const pattern of Object.values(patterns)) delete pattern.last_departure;

const output = {
  schema_version: 1,
  source: "https://web.mta.info/developers/data/nyct/subway/google_transit.zip",
  generated_at: new Date().toISOString(),
  stops,
  patterns,
};

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify(output)}\n`);
console.log(`Wrote ${Object.keys(stops).length} stops and ${Object.keys(patterns).length} patterns to ${outputFile}`);

function squareDistance(point, left, right) {
  let x = left[0];
  let y = left[1];
  let dx = right[0] - x;
  let dy = right[1] - y;
  if (dx || dy) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = right[0];
      y = right[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
    dx = point[0] - x;
    dy = point[1] - y;
  }
  return dx * dx + dy * dy;
}

function simplify(points, tolerance = 0.00004) {
  if (points.length <= 2) return points;
  const keep = new Uint8Array(points.length);
  const stack = [[0, points.length - 1]];
  const threshold = tolerance * tolerance;
  keep[0] = 1;
  keep[points.length - 1] = 1;
  while (stack.length) {
    const [first, last] = stack.pop();
    let furthest = threshold;
    let index = -1;
    for (let cursor = first + 1; cursor < last; cursor += 1) {
      const distance = squareDistance(points[cursor], points[first], points[last]);
      if (distance > furthest) {
        furthest = distance;
        index = cursor;
      }
    }
    if (index > 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, index) => keep[index]);
}

const shapes = new Map();
for (const row of readCsv("shapes.txt")) {
  if (!routesByShape.has(row.shape_id)) continue;
  if (!shapes.has(row.shape_id)) shapes.set(row.shape_id, []);
  shapes.get(row.shape_id).push({
    sequence: Number(row.shape_pt_sequence),
    coordinates: [Number(row.shape_pt_lon), Number(row.shape_pt_lat)],
  });
}

const routeFeatures = [];
const seenRouteGeometry = new Map();
for (const [shapeId, points] of shapes) {
  const coordinates = simplify(points.sort((a, b) => a.sequence - b.sequence).map((point) => point.coordinates));
  for (const routeId of routesByShape.get(shapeId)) {
    if (!seenRouteGeometry.has(routeId)) seenRouteGeometry.set(routeId, new Set());
    const geometryKey = JSON.stringify(coordinates);
    if (seenRouteGeometry.get(routeId).has(geometryKey)) continue;
    seenRouteGeometry.get(routeId).add(geometryKey);
    routeFeatures.push({
      type: "Feature",
      properties: { route_id: routeId, shape_id: shapeId },
      geometry: { type: "LineString", coordinates },
    });
  }
}

const routesOutput = {
  type: "FeatureCollection",
  metadata: {
    source: output.source,
    generated_at: output.generated_at,
    position_type: "scheduled route geometry",
  },
  features: routeFeatures,
};
fs.mkdirSync(path.dirname(routesOutputFile), { recursive: true });
fs.writeFileSync(routesOutputFile, `${JSON.stringify(routesOutput)}\n`);
console.log(`Wrote ${routeFeatures.length} route shapes to ${routesOutputFile}`);
