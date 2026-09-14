import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ready: false, status: "offline", message: "Method not allowed." });
  }

  const file = path.join(process.cwd(), "streaming", "latest.json");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  if (!fs.existsSync(file)) {
    return res.status(200).json({ ready: false, status: "offline", message: "Start streaming/consumer.py first." });
  }

  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const lastEventMs = Date.parse(data.last_event_at || "");
    const eventAgeSeconds = Number.isFinite(lastEventMs)
      ? Math.max(0, Math.round((Date.now() - lastEventMs) / 1000))
      : null;
    const status = eventAgeSeconds != null && eventAgeSeconds <= 90 ? "live" : "stale";
    return res.status(200).json({ ready: true, status, event_age_seconds: eventAgeSeconds, ...data });
  } catch {
    return res.status(503).json({ ready: false, status: "offline", message: "Streaming data is being updated." });
  }
}
