import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import styles from "./map.module.scss";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAP_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE || "mapbox://styles/mapbox/streets-v12";
const SOURCE_ID = "311-data";
const BOROUGHS = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];
const INITIAL_VIEW = { longitude: -73.98, latitude: 40.698, zoom: 11 };

mapboxgl.accessToken = MAPBOX_TOKEN || "";

async function loadLocations(signal) {
  const response = await fetch("/data/map/points.geojson", { signal });
  if (!response.ok) {
    throw new Error(`Unable to load map data (${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data.features)) {
    throw new Error("Map data is not a valid GeoJSON FeatureCollection");
  }

  return {
    type: "FeatureCollection",
    features: data.features.filter(
      (feature) =>
        feature?.geometry?.type === "Point" &&
        Array.isArray(feature.geometry.coordinates) &&
        feature.geometry.coordinates.length >= 2
    ),
  };
}

function createPopupContent(properties = {}) {
  const fields = [
    ["Request ID", "service_request_id"], ["Status", "status"], ["Source", "source"],
    ["Created", "created_date"], ["Inspections", "inspection_count"],
    ["Work orders", "work_order_count"], ["Maximum risk", "max_risk_rating"],
  ];
  const container = document.createElement("div");
  const list = document.createElement("dl");

  fields.forEach(([label, key]) => {
    const term = document.createElement("dt");
    const value = document.createElement("dd");
    term.textContent = label;
    value.textContent = properties[key] ?? "Not available";
    list.append(term, value);
  });

  container.appendChild(list);
  return container;
}

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [view, setView] = useState(INITIAL_VIEW);
  const [visibleBoroughs, setVisibleBoroughs] = useState(() => new Set(BOROUGHS));
  const boroughsRef = useRef(visibleBoroughs);
  const [status, setStatus] = useState(MAPBOX_TOKEN
    ? { state: "loading", count: 0, message: "" }
    : { state: "error", count: 0, message: "Map unavailable: configure NEXT_PUBLIC_MAPBOX_TOKEN." });

  useEffect(() => {
    if (!mapContainer.current || map.current) return undefined;

    if (!MAPBOX_TOKEN) {
      return undefined;
    }

    const controller = new AbortController();
    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
      zoom: INITIAL_VIEW.zoom,
    });
    map.current = mapInstance;
    mapInstance.addControl(new mapboxgl.NavigationControl(), "bottom-left");

    let resizeFrame;
    let disposed = false;
    const resizeMap = () => {
      resizeFrame = undefined;
      if (!disposed && map.current === mapInstance) mapInstance.resize();
    };
    const scheduleResize = () => {
      if (disposed || resizeFrame !== undefined) return;
      resizeFrame = window.requestAnimationFrame(resizeMap);
    };
    const resizeObserver = new ResizeObserver(scheduleResize);
    resizeObserver.observe(mapContainer.current);
    window.addEventListener("resize", scheduleResize);

    const handleMove = () => {
      const center = mapInstance.getCenter();
      setView({
        longitude: center.lng.toFixed(4),
        latitude: center.lat.toFixed(4),
        zoom: mapInstance.getZoom().toFixed(2),
      });
    };

    mapInstance.on("moveend", handleMove);
    mapInstance.on("load", async () => {
      try {
        const geojson = await loadLocations(controller.signal);
        if (controller.signal.aborted) return;

        mapInstance.addSource(SOURCE_ID, { type: "geojson", data: geojson });

        BOROUGHS.forEach((borough) => {
          const layerId = `borough-${borough.toLowerCase().replaceAll(" ", "-")}`;
          mapInstance.addLayer({
            id: layerId,
            source: SOURCE_ID,
            type: "circle",
            layout: { visibility: boroughsRef.current.has(borough) ? "visible" : "none" },
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 7],
              "circle-color": "#ffe600",
              "circle-opacity": 0.8,
              "circle-stroke-color": "#29270f",
              "circle-stroke-width": 1,
            },
            filter: ["==", ["get", "borough"], borough],
          });

          mapInstance.on("click", layerId, (event) => {
            const feature = event.features?.[0];
            if (!feature) return;
            const coordinates = feature.geometry.coordinates.slice();

            while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
              coordinates[0] += event.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            new mapboxgl.Popup({ className: styles.mapPopup })
              .setLngLat(coordinates)
              .setDOMContent(createPopupContent(feature.properties))
              .addTo(mapInstance);
          });
          mapInstance.on("mouseenter", layerId, () => {
            mapInstance.getCanvas().style.cursor = "pointer";
          });
          mapInstance.on("mouseleave", layerId, () => {
            mapInstance.getCanvas().style.cursor = "";
          });
        });

        setStatus({ state: "ready", count: geojson.features.length, message: "" });
      } catch (error) {
        if (error.name !== "AbortError") {
          setStatus({ state: "error", count: 0, message: error.message });
        }
      }
    });
    mapInstance.on("error", (event) => {
      if (event?.error?.message) {
        setStatus((current) =>
          current.state === "loading"
            ? { state: "error", count: 0, message: "The map style could not be loaded." }
            : current
        );
      }
    });

    return () => {
      disposed = true;
      controller.abort();
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleResize);
      if (resizeFrame !== undefined) window.cancelAnimationFrame(resizeFrame);
      mapInstance.remove();
      map.current = null;
    };
  }, []);

  function toggleBorough(borough) {
    const next = new Set(boroughsRef.current);
    if (next.has(borough)) next.delete(borough);
    else next.add(borough);
    boroughsRef.current = next;
    setVisibleBoroughs(next);
    const layerId = `borough-${borough.toLowerCase().replaceAll(" ", "-")}`;
    if (map.current?.getLayer(layerId)) {
      map.current.setLayoutProperty(layerId, "visibility", next.has(borough) ? "visible" : "none");
    }
  }

  return (
    <section className={styles.mapWrapper} aria-label="NYC forestry service request map">
      <div className={styles.mapSidebar} aria-live="polite">
        Longitude: {view.longitude} | Latitude: {view.latitude} | Zoom: {view.zoom}
      </div>

      <fieldset className={styles.filterGroup}>
        <legend>Show boroughs</legend>
        {BOROUGHS.map((borough) => {
          const id = `filter-${borough.toLowerCase().replaceAll(" ", "-")}`;
          return (
            <React.Fragment key={borough}>
              <input
                id={id}
                type="checkbox"
                checked={visibleBoroughs.has(borough)}
                onChange={() => toggleBorough(borough)}
              />
              <label htmlFor={id}>{borough}</label>
            </React.Fragment>
          );
        })}
      </fieldset>

      {status.state === "loading" && (
        <div className={styles.mapLoader} role="status">
          <p>Loading the trees <span aria-hidden="true">🍃</span></p>
        </div>
      )}
      {status.state === "error" && (
        <div className={styles.mapLoader} role="alert">
          <p>{status.message}</p>
        </div>
      )}
      {status.state === "ready" && (
        <p className={styles.mapSummary}>{status.count.toLocaleString()} historical records loaded; {visibleBoroughs.size} of {BOROUGHS.length} boroughs enabled</p>
      )}
      <div ref={mapContainer} className={styles.mapContainer} />
    </section>
  );
}
