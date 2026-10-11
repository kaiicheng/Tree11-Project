import fs from "node:fs";
import path from "node:path";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const EMPTY = { type: "FeatureCollection", features: [] };
const DEFAULT_SUBWAY_FEED_URLS = [
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l",
  "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
];
const CACHE_MS = 25_000;
const ACTIVE_SECONDS = 180;
const subwayIndex = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "transit", "subway-index.json"), "utf8"));

let cache = { expiresAt: 0, value: null, pending: null };

export const config = { maxDuration: 15, api: { responseLimit: "512kb" } };

function timestamp(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function stopEventTime(update) {
  return timestamp(update?.arrival?.time) ?? timestamp(update?.departure?.time);
}

function patternFromTripId(tripId) {
  return String(tripId || "").split("_").at(-1);
}

function patternMatchScore(pattern, upcomingStops) {
  const start = pattern.stops.indexOf(upcomingStops[0]);
  if (start < 0) return { score: 0, start };
  let score = 0;
  while (score < upcomingStops.length && pattern.stops[start + score] === upcomingStops[score]) score += 1;
  return { score, start };
}

function resolveApproach(index, routeId, tripId, upcomingStops) {
  if (!upcomingStops.length) return null;
  const exactId = patternFromTripId(tripId);
  const candidates = [];
  if (index.patterns[exactId]) candidates.push([exactId, index.patterns[exactId]]);
  for (const [patternId, pattern] of Object.entries(index.patterns)) {
    if (patternId === exactId || !patternId.startsWith(`${routeId}..`)) continue;
    candidates.push([patternId, pattern]);
  }

  let best = null;
  for (const [patternId, pattern] of candidates) {
    const match = patternMatchScore(pattern, upcomingStops);
    if (match.start <= 0 || (best && match.score <= best.score)) continue;
    best = { patternId, pattern, ...match };
  }
  if (!best) return null;
  return {
    fromStopId: best.pattern.stops[best.start - 1],
    segmentSeconds: best.pattern.segment_seconds[best.start - 1] || 90,
    patternId: best.patternId,
  };
}

function stopDetails(index, stopId) {
  const entry = index.stops[stopId];
  return entry ? { coordinates: entry.slice(0, 2), name: entry[2] } : null;
}

function tripKey(trip = {}) {
  return `${trip.startDate || ""}|${trip.tripId || ""}`;
}

function vehicleStatus(value) {
  if (value === 0 || value === "INCOMING_AT") return "INCOMING_AT";
  if (value === 1 || value === "STOPPED_AT") return "STOPPED_AT";
  if (value === 2 || value === "IN_TRANSIT_TO") return "IN_TRANSIT_TO";
  return "UNKNOWN";
}

export function subwayFeedToGeoJson(feed, index = subwayIndex, receivedAt = new Date()) {
  const feedTimestamp = timestamp(feed.header?.timestamp) ?? Math.floor(receivedAt.getTime() / 1000);
  const updates = new Map();
  for (const entity of feed.entity || []) {
    if (entity.tripUpdate?.trip?.tripId) updates.set(tripKey(entity.tripUpdate.trip), entity.tripUpdate);
  }

  const features = [];
  for (const entity of feed.entity || []) {
    const vehicle = entity.vehicle;
    const trip = vehicle?.trip;
    if (!vehicle || !trip?.tripId || !trip.routeId) continue;
    const observedAt = timestamp(vehicle.timestamp) ?? feedTimestamp;
    if (feedTimestamp - observedAt > ACTIVE_SECONDS) continue;

    const tripUpdate = updates.get(tripKey(trip));
    const stopUpdates = (tripUpdate?.stopTimeUpdate || []).filter((update) => stopDetails(index, update.stopId));
    const vehicleStopId = vehicle.stopId;
    let targetIndex = stopUpdates.findIndex((update) => update.stopId === vehicleStopId);
    if (targetIndex < 0) targetIndex = stopUpdates.findIndex((update) => (stopEventTime(update) || Infinity) >= feedTimestamp);
    if (targetIndex < 0 && stopUpdates.length) targetIndex = stopUpdates.length - 1;

    const targetUpdate = stopUpdates[targetIndex];
    const targetStopId = vehicleStopId && stopDetails(index, vehicleStopId) ? vehicleStopId : targetUpdate?.stopId;
    const targetStop = stopDetails(index, targetStopId);
    if (!targetStop) continue;
    const movementStatus = vehicleStatus(vehicle.currentStatus);

    let coordinates = targetStop.coordinates;
    let fromStopId = targetStopId;
    let progress = 1;
    let patternId = patternFromTripId(trip.tripId);

    if (movementStatus !== "STOPPED_AT") {
      const upcomingStops = stopUpdates.slice(Math.max(0, targetIndex)).map((update) => update.stopId);
      const priorUpdate = targetIndex > 0 ? stopUpdates[targetIndex - 1] : null;
      const approach = priorUpdate
        ? { fromStopId: priorUpdate.stopId, segmentSeconds: Math.max(30, (stopEventTime(targetUpdate) || 0) - (timestamp(priorUpdate.departure?.time) || stopEventTime(priorUpdate) || 0)), patternId }
        : resolveApproach(index, trip.routeId, trip.tripId, upcomingStops);
      const fromStop = stopDetails(index, approach?.fromStopId);
      if (fromStop && approach) {
        const arrivalTime = stopEventTime(targetUpdate);
        const duration = Math.max(30, Math.min(300, approach.segmentSeconds || 90));
        const departureTime = priorUpdate
          ? timestamp(priorUpdate.departure?.time) ?? stopEventTime(priorUpdate)
          : arrivalTime != null ? arrivalTime - duration : null;
        progress = arrivalTime != null && departureTime != null
          ? Math.max(0, Math.min(1, (feedTimestamp - departureTime) / Math.max(1, arrivalTime - departureTime)))
          : 0.5;
        coordinates = [
          fromStop.coordinates[0] + (targetStop.coordinates[0] - fromStop.coordinates[0]) * progress,
          fromStop.coordinates[1] + (targetStop.coordinates[1] - fromStop.coordinates[1]) * progress,
        ];
        fromStopId = approach.fromStopId;
        patternId = approach.patternId;
      }
    }

    const lastStop = stopDetails(index, stopUpdates.at(-1)?.stopId);
    const directionCode = targetStopId?.at(-1);
    const featureId = `subway-${vehicle.vehicle?.id || trip.tripId || entity.id}`;
    features.push({
      type: "Feature",
      id: featureId,
      geometry: { type: "Point", coordinates },
      properties: {
        vehicle_id: vehicle.vehicle?.id || "Not supplied",
        trip_id: trip.tripId,
        route_id: trip.routeId,
        direction: directionCode === "N" ? "Northbound" : directionCode === "S" ? "Southbound" : "Unknown",
        movement_status: movementStatus,
        from_stop: stopDetails(index, fromStopId)?.name || fromStopId,
        next_stop: targetStop.name,
        destination: lastStop?.name || "Not available",
        next_arrival: stopEventTime(targetUpdate) ? new Date(stopEventTime(targetUpdate) * 1000).toISOString() : "Not available",
        progress: Math.round(progress * 100),
        position_type: "Estimated from MTA station times",
        pattern_id: patternId,
        updated_at: new Date(observedAt * 1000).toISOString(),
      },
    });
  }

  const generatedAt = new Date(feedTimestamp * 1000).toISOString();
  return {
    type: "FeatureCollection",
    generated_at: generatedAt,
    source: "mta-subway-gtfs-realtime",
    status: "live",
    position_type: "estimated",
    age_seconds: Math.max(0, Math.round(receivedAt.getTime() / 1000 - feedTimestamp)),
    features,
  };
}

export async function fetchSubwaySnapshot() {
  if (cache.value && cache.expiresAt > Date.now()) return cache.value;
  if (cache.pending) return cache.pending;

  cache.pending = (async () => {
    const feedUrls = process.env.MTA_SUBWAY_FEED_URL
      ? process.env.MTA_SUBWAY_FEED_URL.split(",").map((url) => url.trim()).filter(Boolean)
      : DEFAULT_SUBWAY_FEED_URLS;
    const settled = await Promise.allSettled(feedUrls.map(async (url) => {
      const response = await fetch(url, {
        headers: { "User-Agent": "Tree11 educational dashboard (https://www.tree11.org)" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`MTA Subway returned HTTP ${response.status}.`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes);
      return subwayFeedToGeoJson(feed);
    }));
    const snapshots = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    if (!snapshots.length) {
      const reason = settled.find((result) => result.status === "rejected")?.reason;
      throw reason instanceof Error ? reason : new Error("All MTA Subway feeds are unavailable.");
    }
    const generatedAt = snapshots.map((snapshot) => snapshot.generated_at).sort().at(-1);
    const value = {
      type: "FeatureCollection",
      generated_at: generatedAt,
      source: "mta-subway-gtfs-realtime",
      status: snapshots.length === feedUrls.length ? "live" : "partial",
      position_type: "estimated",
      age_seconds: Math.max(...snapshots.map((snapshot) => snapshot.age_seconds)),
      feed_count: snapshots.length,
      features: snapshots.flatMap((snapshot) => snapshot.features),
    };
    cache = { expiresAt: Date.now() + CACHE_MS, value, pending: null };
    return value;
  })();

  try { return await cache.pending; } finally { cache.pending = null; }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ...EMPTY, status: "offline" });
  }
  try {
    const snapshot = await fetchSubwaySnapshot();
    res.setHeader("Cache-Control", "public, s-maxage=25, stale-while-revalidate=50");
    return res.status(200).json(snapshot);
  } catch (error) {
    console.error("Unable to load MTA Subway positions", error);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(503).json({ ...EMPTY, status: "offline", position_type: "estimated", message: error instanceof Error ? error.message : "MTA Subway data is unavailable." });
  }
}
