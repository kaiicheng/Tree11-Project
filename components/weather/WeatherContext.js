import { useEffect, useState } from "react";
import styles from "./weather.module.scss";

const POINT = "40.7128,-74.0060";
const REFRESH_MS = 10 * 60 * 1000;

async function getJson(url, signal) {
  const response = await fetch(url, { headers: { Accept: "application/geo+json" }, signal });
  if (!response.ok) throw new Error(`NWS request failed: ${response.status}`);
  return response.json();
}

function fahrenheit(value) {
  return value == null ? null : Math.round((value * 9) / 5 + 32);
}

async function loadWeather(signal) {
  const point = await getJson(`https://api.weather.gov/points/${POINT}`, signal);
  const stations = await getJson(point.properties.observationStations, signal);
  const stationId = stations.features?.[0]?.id;
  const [observation, alerts] = await Promise.all([
    stationId ? getJson(`${stationId}/observations/latest`, signal) : Promise.resolve(null),
    getJson(`https://api.weather.gov/alerts/active?point=${POINT}`, signal),
  ]);
  const properties = observation?.properties || {};
  const alertItems = (alerts.features || []).map(({ properties: item }) => ({
    event: item.event || "Weather alert",
    headline: item.headline || item.description || "Active alert",
  }));
  return {
    temperature: fahrenheit(properties.temperature?.value),
    windMph: properties.windSpeed?.value == null ? null : Math.round(properties.windSpeed.value * 0.621371),
    description: properties.textDescription || "Current conditions unavailable",
    observedAt: properties.timestamp,
    alerts: alertItems,
  };
}

function timeLabel(timestamp) {
  if (!timestamp) return "time unavailable";
  return new Date(timestamp).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function WeatherContext() {
  const [state, setState] = useState({ status: "loading", data: null });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const refresh = async () => {
      try {
        const data = await loadWeather(controller.signal);
        if (active) setState({ status: "ready", data });
      } catch (error) {
        if (active && error.name !== "AbortError") setState({ status: "error", data: null });
      }
    };
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  const { status, data } = state;
  return (
    <section className={styles.weatherContext} aria-label="NYC weather and active alerts">
      <div className={styles.weatherHeading}>
        <div><span className={styles.weatherEyebrow}>Live context</span><h2>NYC weather &amp; alerts</h2></div>
        <span className={styles.weatherSource}>NWS</span>
      </div>
      {status === "loading" && <p className={styles.weatherStatus}>Loading current conditions…</p>}
      {status === "error" && <p className={styles.weatherStatus}>Weather data is temporarily unavailable. Tree11 data remains available.</p>}
      {data && <>
        <div className={styles.weatherGrid}>
          <div><strong>{data.temperature == null ? "—" : `${data.temperature}°F`}</strong><span>{data.description}</span></div>
          <div><strong>{data.windMph == null ? "—" : `${data.windMph} mph`}</strong><span>wind</span></div>
          <div><strong>{data.alerts.length}</strong><span>active alerts</span></div>
        </div>
        {data.alerts.length > 0 && <ul className={styles.alertList}>{data.alerts.slice(0, 1).map((alert) => <li key={`${alert.event}-${alert.headline}`}><strong>{alert.event}</strong><span>{alert.headline}</span></li>)}</ul>}
        <p className={styles.weatherMeta}>Observed {timeLabel(data.observedAt)} · updates every 10 min · <a href="https://www.weather.gov/" target="_blank" rel="noreferrer">NWS</a></p>
      </>}
    </section>
  );
}
