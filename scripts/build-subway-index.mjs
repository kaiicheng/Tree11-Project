import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const sourceDirectory = process.argv[2];
const outputFile = process.argv[3] || path.join("data", "transit", "subway-index.json");

if (!sourceDirectory) {
  console.error("Usage: node scripts/build-subway-index.mjs <extracted GTFS directory> [output file]");
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

const patternByTrip = new Map();
for (const trip of readCsv("trips.txt")) {
  const patternId = trip.trip_id.split("_").at(-1);
  patternByTrip.set(trip.trip_id, patternId);
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
