import fs from "fs";
import path from "path";

const EMPTY = { type: "FeatureCollection", features: [] };

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ...EMPTY, status: "offline" });
  }

  const file = path.join(process.cwd(), "streaming", "vehicles.geojson");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (!fs.existsSync(file)) return res.status(200).json({ ...EMPTY, status: "offline" });

  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const generatedMs = Date.parse(data.generated_at || "");
    const ageSeconds = Number.isFinite(generatedMs) ? Math.max(0, Math.round((Date.now() - generatedMs) / 1000)) : null;
    return res.status(200).json({ ...data, status: ageSeconds != null && ageSeconds <= 90 ? "live" : "stale", age_seconds: ageSeconds });
  } catch {
    return res.status(503).json({ ...EMPTY, status: "offline" });
  }
}
