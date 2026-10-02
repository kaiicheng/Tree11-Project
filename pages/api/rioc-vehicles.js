const EMPTY = { type: "FeatureCollection", features: [] };
const RIOC_BASE_URL = "https://retro.umoiq.com/service/publicXMLFeed";
const RIOC_ROUTES = ["shuttle", "express"];
const CACHE_MS = 15_000;

let cache = { expiresAt: 0, value: null, pending: null };

export const config = { maxDuration: 10, api: { responseLimit: "256kb" } };

function xmlAttributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
}

export function nextBusXmlToFeatures(xml, route, capturedAt = new Date()) {
  const features = [];
  for (const match of xml.matchAll(/<vehicle\s+[^>]*\/>/g)) {
    const vehicle = xmlAttributes(match[0]);
    const latitude = Number(vehicle.lat);
    const longitude = Number(vehicle.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;
    const ageSeconds = Math.max(0, Number(vehicle.secsSinceReport) || 0);
    const vehicleId = vehicle.id || `${route}-${features.length}`;
    features.push({
      type: "Feature",
      id: `rioc-${vehicleId}`,
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      properties: {
        vehicle_id: vehicleId,
        route_id: vehicle.routeTag || route,
        route_name: (vehicle.routeTag || route) === "express" ? "Red Bus Express" : "Red Bus",
        direction: vehicle.dirTag === "n" ? "Northbound" : vehicle.dirTag === "s" ? "Southbound" : "Unknown",
        heading: vehicle.heading || "Not available",
        speed_kmh: vehicle.speedKmHr || "Not available",
        updated_at: new Date(capturedAt.getTime() - ageSeconds * 1000).toISOString(),
      },
    });
  }
  return features;
}

async function fetchRoute(route, capturedAt) {
  const url = new URL(RIOC_BASE_URL);
  url.searchParams.set("command", "vehicleLocations");
  url.searchParams.set("a", "roosevelt");
  url.searchParams.set("r", route);
  url.searchParams.set("t", "0");
  const response = await fetch(url, {
    headers: { "User-Agent": "Tree11 educational dashboard (https://www.tree11.org)" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`RIOC returned HTTP ${response.status}.`);
  return nextBusXmlToFeatures(await response.text(), route, capturedAt);
}

export async function fetchRiocSnapshot() {
  if (cache.value && cache.expiresAt > Date.now()) return cache.value;
  if (cache.pending) return cache.pending;
  cache.pending = (async () => {
    const capturedAt = new Date();
    const routes = await Promise.all(RIOC_ROUTES.map((route) => fetchRoute(route, capturedAt)));
    const value = { ...EMPTY, generated_at: capturedAt.toISOString(), source: "rioc-nextbus", status: "live", age_seconds: 0, features: routes.flat() };
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
    const snapshot = await fetchRiocSnapshot();
    res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=30");
    return res.status(200).json(snapshot);
  } catch (error) {
    console.error("Unable to load RIOC Red Bus positions", error);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(503).json({ ...EMPTY, status: "offline", message: error instanceof Error ? error.message : "RIOC vehicle data is unavailable." });
  }
}
