import { useEffect, useState } from "react";
import styles from "./live-stream.module.scss";

export default function LiveStreamCard() {
  const [payload, setPayload] = useState({ ready: false, status: "loading" });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/streaming", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Streaming API unavailable");
        const data = await response.json();
        if (active) setPayload(data);
      } catch (error) {
        if (active && error.name !== "AbortError") setPayload({ ready: false, status: "offline" });
      }
    };
    load();
    const timer = setInterval(load, 30_000);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const ready = payload.ready;
  const weather = payload.nws;
  const streamStatus = payload.status || "offline";
  const vehicleCount = payload.mta?.active_vehicle_count || 0;
  const routeCount = payload.mta?.route_count || 0;
  const statusClass = streamStatus === "live" ? styles.online : streamStatus === "stale" ? styles.stale : "";

  return <section className={styles.liveStream} aria-label="Live transit and weather stream">
    <div className={styles.liveStreamHeader}>
      <div><span>Kafka streaming lab</span><h2>Live city signals</h2></div>
      <b className={statusClass}>{streamStatus.toUpperCase()}</b>
    </div>
    {ready ? <div className={styles.liveStreamGrid}>
      <div><strong>{vehicleCount.toLocaleString()}</strong><span>MTA vehicles active in the last {Math.round((payload.mta?.active_window_seconds || 180) / 60)} min</span></div>
      <div><strong>{routeCount.toLocaleString()}</strong><span>active MTA routes</span></div>
      <div><strong>{weather?.temperature_c == null ? "—" : `${Math.round(weather.temperature_c * 9 / 5 + 32)}°F`}</strong><span>latest Kafka NWS observation</span></div>
      <div><strong>{payload.event_age_seconds == null ? "—" : `${payload.event_age_seconds}s`}</strong><span>since last Kafka event</span></div>
    </div> : <p>{streamStatus === "loading" ? "Checking local stream…" : "Start Kafka, producer, and consumer locally to display live signals."}</p>}
  </section>;
}
