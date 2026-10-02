import fs from "fs";
import path from "path";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const EMPTY = { type: "FeatureCollection", features: [] };
const LOCAL_MAX_AGE_SECONDS = 90;
const CLOUD_CACHE_MS = 25_000;
const DEFAULT_MTA_FEED_URL = "https://gtfsrt.prod.obanyc.com/vehiclePositions";

let cloudCache = { expiresAt: 0, value: null, pending: null };

export const config = {
  maxDuration: 15,
  api: { responseLimit: "2mb" },
};

function ageInSeconds(timestamp) {
  const milliseconds = Date.parse(timestamp || "");
  return Number.isFinite(milliseconds)
    ? Math.max(0, Math.round((Date.now() - milliseconds) / 1000))
    : null;
}

function readLocalSnapshot() {
  const file = path.join(process.cwd(), "streaming", "vehicles.geojson");
  if (!fs.existsSync(file)) return null;

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (data?.type !== "FeatureCollection" || !Array.isArray(data.features)) return null;
  const ageSeconds = ageInSeconds(data.generated_at);
  return {
    ...data,
    source: "local-kafka",
    status: ageSeconds != null && ageSeconds <= LOCAL_MAX_AGE_SECONDS ? "live" : "stale",
    age_seconds: ageSeconds,
  };
}

function mtaFeedUrl() {
  const configured = process.env.MTA_FEED_URL || DEFAULT_MTA_FEED_URL;
  const apiKey = process.env.MTA_API_KEY;
  const url = new URL(configured);
  if (apiKey && !url.searchParams.has("key")) url.searchParams.set("key", apiKey);
  if (!url.searchParams.get("key")) throw new Error("MTA_API_KEY is not configured.");
  return url;
}

export function feedToGeoJson(feed, generatedAt = new Date().toISOString()) {
  const features = [];

  for (const entity of feed.entity || []) {
    const vehicle = entity.vehicle;
    const latitude = Number(vehicle?.position?.latitude);
    const longitude = Number(vehicle?.position?.longitude);
    if (!vehicle || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;

    const timestamp = Number(vehicle.timestamp || 0);
    const vehicleId = vehicle.vehicle?.id || entity.id;
    features.push({
      type: "Feature",
      id: vehicleId || undefined,
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      properties: {
        vehicle_id: vehicleId || "Unknown",
        route_id: vehicle.trip?.routeId || "Unknown",
        trip_id: vehicle.trip?.tripId || "Not available",
        updated_at: timestamp > 0 ? new Date(timestamp * 1000).toISOString() : generatedAt,
      },
    });
  }

  return { type: "FeatureCollection", generated_at: generatedAt, features };
}

export async function fetchMtaCloudSnapshot() {
  if (cloudCache.value && cloudCache.expiresAt > Date.now()) return cloudCache.value;
  if (cloudCache.pending) return cloudCache.pending;

  cloudCache.pending = (async () => {
    const response = await fetch(mtaFeedUrl(), {
      headers: { "User-Agent": "Tree11 educational dashboard (https://www.tree11.org)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`MTA returned HTTP ${response.status}.`);

    const bytes = new Uint8Array(await response.arrayBuffer());
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes);
    const data = feedToGeoJson(feed);
    const value = {
      ...data,
      source: "mta-cloud-fallback",
      status: "live",
      age_seconds: 0,
    };
    cloudCache = { expiresAt: Date.now() + CLOUD_CACHE_MS, value, pending: null };
    return value;
  })();

  try {
    return await cloudCache.pending;
  } finally {
    cloudCache.pending = null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ...EMPTY, status: "offline" });
  }

  try {
    const local = readLocalSnapshot();
    if (local) {
      res.setHeader("Cache-Control", "no-store, max-age=0");
      return res.status(200).json(local);
    }

    const cloud = await fetchMtaCloudSnapshot();
    res.setHeader("Cache-Control", "public, s-maxage=20, stale-while-revalidate=40");
    return res.status(200).json(cloud);
  } catch (error) {
    console.error("Unable to load MTA vehicle positions", error);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(503).json({
      ...EMPTY,
      status: "offline",
      message: error instanceof Error ? error.message : "MTA vehicle data is unavailable.",
    });
  }
}
