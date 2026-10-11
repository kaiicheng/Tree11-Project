import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import styles from "./map.module.scss";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAP_STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE || "mapbox://styles/mapbox/streets-v12";
const SOURCE_ID = "311-data";
const MTA_SOURCE_ID = "mta-vehicles";
const MTA_LAYER_ID = "mta-vehicles-layer";
const SUBWAY_SOURCE_ID = "subway-vehicles";
const SUBWAY_LAYER_ID = "subway-vehicles-layer";
const SUBWAY_LABEL_LAYER_ID = "subway-vehicles-labels";
const SUBWAY_ROUTES_SOURCE_ID = "subway-routes";
const SUBWAY_ROUTES_LAYER_ID = "subway-route-lines";
const RIOC_SOURCE_ID = "rioc-vehicles";
const RIOC_LAYER_ID = "rioc-vehicles-layer";
const MTA_REFRESH_MS = 30_000;
const SUBWAY_REFRESH_MS = 30_000;
const RIOC_REFRESH_MS = 15_000;
const MTA_ANIMATION_MS = 8_000;
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

async function loadMtaVehicles(signal) {
  const response = await fetch("/api/mta-vehicles", { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Unable to load MTA vehicles (${response.status})`);
  const data = await response.json();
  return {
    geojson: { type: "FeatureCollection", features: Array.isArray(data.features) ? data.features : [] },
    status: data.status || "offline",
    ageSeconds: data.age_seconds ?? null,
  };
}

async function loadRiocVehicles(signal) {
  const response = await fetch("/api/rioc-vehicles", { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Unable to load RIOC vehicles (${response.status})`);
  const data = await response.json();
  return {
    geojson: { type: "FeatureCollection", features: Array.isArray(data.features) ? data.features : [] },
    status: data.status || "offline",
  };
}

async function loadSubwayVehicles(signal) {
  const response = await fetch("/api/subway-vehicles", { cache: "no-store", signal });
  if (!response.ok) throw new Error(`Unable to load MTA Subway trains (${response.status})`);
  const data = await response.json();
  return {
    geojson: { type: "FeatureCollection", features: Array.isArray(data.features) ? data.features : [] },
    status: data.status || "offline",
    ageSeconds: data.age_seconds ?? null,
  };
}

async function loadSubwayRoutes(signal) {
  const response = await fetch("/data/transit/subway-routes.geojson", { signal });
  if (!response.ok) throw new Error(`Unable to load subway route lines (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data.features)) throw new Error("Subway routes are not valid GeoJSON");
  return data;
}

function mtaRouteFilter(routeId) {
  return routeId === "all" ? null : ["==", ["get", "route_id"], routeId];
}

function subwayRouteFilter(routeId) {
  return routeId === "all" ? null : ["==", ["get", "route_id"], routeId];
}

function subwayRouteColorExpression() {
  return ["match", ["get", "route_id"],
    "1", "#EE352E", "2", "#EE352E", "3", "#EE352E",
    "4", "#00933C", "5", "#00933C", "6", "#00933C",
    "7", "#B933AD", "A", "#0039A6", "C", "#0039A6", "E", "#0039A6",
    "B", "#FF6319", "D", "#FF6319", "F", "#FF6319", "M", "#FF6319",
    "G", "#6CBE45", "J", "#996633", "Z", "#996633", "L", "#A7A9AC",
    "N", "#FCCC0A", "Q", "#FCCC0A", "R", "#FCCC0A", "W", "#FCCC0A",
    "#808183"];
}

function routeOptions(features) {
  return [...new Set(features.map((feature) => feature?.properties?.route_id).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

function interpolateFeatures(previous, next, progress) {
  const priorById = new Map(previous.map((feature) => [String(feature.id), feature]));
  return next.map((feature) => {
    const prior = priorById.get(String(feature.id));
    const from = prior?.geometry?.coordinates;
    const to = feature?.geometry?.coordinates;
    if (!Array.isArray(from) || !Array.isArray(to) || from.length !== 2 || to.length !== 2) return feature;
    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: [from[0] + (to[0] - from[0]) * progress, from[1] + (to[1] - from[1]) * progress],
      },
    };
  });
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

function createMtaPopupContent(properties = {}) {
  const fields = [
    ["Route", "route_id"], ["Vehicle ID", "vehicle_id"],
    ["Trip ID", "trip_id"], ["Position updated", "updated_at"],
  ];
  const container = document.createElement("div");
  const heading = document.createElement("strong");
  const list = document.createElement("dl");
  heading.textContent = "MTA live vehicle";
  fields.forEach(([label, key]) => {
    const term = document.createElement("dt");
    const value = document.createElement("dd");
    term.textContent = label;
    value.textContent = properties[key] ?? "Not available";
    list.append(term, value);
  });
  container.append(heading, list);
  return container;
}

function createRiocPopupContent(properties = {}) {
  const fields = [
    ["Service", "route_name"], ["Direction", "direction"], ["Vehicle ID", "vehicle_id"],
    ["Speed (km/h)", "speed_kmh"], ["Position updated", "updated_at"],
  ];
  const container = document.createElement("div");
  const heading = document.createElement("strong");
  const list = document.createElement("dl");
  heading.textContent = "RIOC live Red Bus";
  fields.forEach(([label, key]) => {
    const term = document.createElement("dt");
    const value = document.createElement("dd");
    term.textContent = label;
    value.textContent = properties[key] ?? "Not available";
    list.append(term, value);
  });
  container.append(heading, list);
  return container;
}

function createSubwayPopupContent(properties = {}) {
  const fields = [
    ["Line", "route_id"], ["Direction", "direction"], ["Next station", "next_stop"],
    ["Destination", "destination"], ["Estimated progress", "progress"],
    ["Next arrival", "next_arrival"], ["Updated", "updated_at"],
  ];
  const container = document.createElement("div");
  const heading = document.createElement("strong");
  const note = document.createElement("p");
  const list = document.createElement("dl");
  heading.textContent = "MTA Subway — estimated live position";
  note.textContent = "Position is inferred between stations from official MTA real-time arrival data; it is not underground GPS.";
  fields.forEach(([label, key]) => {
    const term = document.createElement("dt");
    const value = document.createElement("dd");
    term.textContent = label;
    value.textContent = key === "progress" && properties[key] != null ? `${properties[key]}%` : properties[key] ?? "Not available";
    list.append(term, value);
  });
  container.append(heading, note, list);
  return container;
}

export default function TreeMap() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [view, setView] = useState(INITIAL_VIEW);
  const [visibleBoroughs, setVisibleBoroughs] = useState(() => new Set(BOROUGHS));
  const boroughsRef = useRef(visibleBoroughs);
  const [showMta, setShowMta] = useState(true);
  const showMtaRef = useRef(showMta);
  const [mtaStatus, setMtaStatus] = useState({ state: "offline", count: 0, ageSeconds: null, renderedCount: 0 });
  const [mtaRoutes, setMtaRoutes] = useState([]);
  const [selectedMtaRoute, setSelectedMtaRoute] = useState("all");
  const selectedMtaRouteRef = useRef(selectedMtaRoute);
  const mtaFeaturesRef = useRef([]);
  const [showSubway, setShowSubway] = useState(true);
  const showSubwayRef = useRef(showSubway);
  const [subwayStatus, setSubwayStatus] = useState({ state: "offline", count: 0, ageSeconds: null, renderedCount: 0 });
  const [subwayRoutes, setSubwayRoutes] = useState([]);
  const [selectedSubwayRoute, setSelectedSubwayRoute] = useState("all");
  const selectedSubwayRouteRef = useRef(selectedSubwayRoute);
  const subwayFeaturesRef = useRef([]);
  const [showSubwayRoutes, setShowSubwayRoutes] = useState(false);
  const showSubwayRoutesRef = useRef(showSubwayRoutes);
  const [showRioc, setShowRioc] = useState(true);
  const showRiocRef = useRef(showRioc);
  const [riocStatus, setRiocStatus] = useState({ state: "offline", count: 0, renderedCount: 0 });
  const riocFeaturesRef = useRef([]);
  const [status, setStatus] = useState(MAPBOX_TOKEN
    ? { state: "loading", count: 0, message: "" }
    : { state: "error", count: 0, message: "Map unavailable: configure NEXT_PUBLIC_MAPBOX_TOKEN." });

  useEffect(() => {
    if (!mapContainer.current || map.current) return undefined;

    if (!MAPBOX_TOKEN) {
      return undefined;
    }

    if (!mapboxgl.supported()) {
      const frame = window.requestAnimationFrame(() => {
        setStatus({
          state: "error",
          count: 0,
          message: "Map unavailable: this browser or device does not support WebGL.",
        });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    let mapInstance;
    try {
      mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAP_STYLE,
        center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
        zoom: INITIAL_VIEW.zoom,
      });
    } catch (error) {
      console.error("Unable to initialize the Mapbox map", error);
      const frame = window.requestAnimationFrame(() => {
        setStatus({
          state: "error",
          count: 0,
          message: "Map unavailable: WebGL could not be initialized. The rest of the dashboard is still available.",
        });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const controller = new AbortController();
    map.current = mapInstance;
    mapInstance.addControl(new mapboxgl.NavigationControl(), "bottom-left");

    let resizeFrame;
    let mtaTimer;
    let subwayTimer;
    let riocTimer;
    let mtaAnimationFrame;
    let subwayAnimationFrame;
    let riocAnimationFrame;
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
        const [geojson, subwayRoutesGeojson] = await Promise.all([
          loadLocations(controller.signal),
          loadSubwayRoutes(controller.signal).catch((error) => {
            if (error.name === "AbortError") throw error;
            console.error("Unable to render subway route lines", error);
            return { type: "FeatureCollection", features: [] };
          }),
        ]);
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

        mapInstance.addSource(MTA_SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        mapInstance.addLayer({
          id: MTA_LAYER_ID,
          source: MTA_SOURCE_ID,
          type: "circle",
          layout: { visibility: showMtaRef.current ? "visible" : "none" },
          ...(selectedMtaRouteRef.current === "all" ? {} : { filter: mtaRouteFilter(selectedMtaRouteRef.current) }),
          paint: {
            // A high-contrast treatment keeps the live signal distinct from
            // the yellow forestry records, even at the city-wide zoom level.
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 4, 14, 8],
            "circle-color": "#006dff",
            "circle-opacity": 1,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1.5,
          },
        });
        mapInstance.on("click", MTA_LAYER_ID, (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          new mapboxgl.Popup({ className: styles.mapPopup })
            .setLngLat(feature.geometry.coordinates.slice())
            .setDOMContent(createMtaPopupContent(feature.properties))
            .addTo(mapInstance);
        });
        mapInstance.on("mouseenter", MTA_LAYER_ID, () => { mapInstance.getCanvas().style.cursor = "pointer"; });
        mapInstance.on("mouseleave", MTA_LAYER_ID, () => { mapInstance.getCanvas().style.cursor = ""; });

        mapInstance.addSource(SUBWAY_SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        mapInstance.addSource(SUBWAY_ROUTES_SOURCE_ID, {
          type: "geojson",
          data: subwayRoutesGeojson,
        });
        mapInstance.addLayer({
          id: SUBWAY_ROUTES_LAYER_ID,
          source: SUBWAY_ROUTES_SOURCE_ID,
          type: "line",
          layout: {
            visibility: showSubwayRoutesRef.current ? "visible" : "none",
            "line-cap": "round",
            "line-join": "round",
          },
          ...(selectedSubwayRouteRef.current === "all" ? {} : { filter: subwayRouteFilter(selectedSubwayRouteRef.current) }),
          paint: {
            "line-color": subwayRouteColorExpression(),
            "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.5, 14, 4],
            "line-opacity": selectedSubwayRouteRef.current === "all" ? 0.16 : 0.72,
          },
        });
        setSubwayRoutes(routeOptions(subwayRoutesGeojson.features));
        mapInstance.addLayer({
          id: SUBWAY_LAYER_ID,
          source: SUBWAY_SOURCE_ID,
          type: "circle",
          layout: { visibility: showSubwayRef.current ? "visible" : "none" },
          ...(selectedSubwayRouteRef.current === "all" ? {} : { filter: subwayRouteFilter(selectedSubwayRouteRef.current) }),
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 7, 14, 12],
            "circle-color": subwayRouteColorExpression(),
            "circle-opacity": 0.95,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });
        mapInstance.addLayer({
          id: SUBWAY_LABEL_LAYER_ID,
          source: SUBWAY_SOURCE_ID,
          type: "symbol",
          layout: {
            visibility: showSubwayRef.current ? "visible" : "none",
            "text-field": ["get", "route_id"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 9, 8, 14, 12],
            "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          ...(selectedSubwayRouteRef.current === "all" ? {} : { filter: subwayRouteFilter(selectedSubwayRouteRef.current) }),
          paint: {
            "text-color": ["match", ["get", "route_id"],
              "N", "#111111", "Q", "#111111", "R", "#111111", "W", "#111111",
              "#ffffff"],
          },
        });
        mapInstance.on("click", SUBWAY_LAYER_ID, (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          new mapboxgl.Popup({ className: styles.mapPopup })
            .setLngLat(feature.geometry.coordinates.slice())
            .setDOMContent(createSubwayPopupContent(feature.properties))
            .addTo(mapInstance);
        });
        mapInstance.on("mouseenter", SUBWAY_LAYER_ID, () => { mapInstance.getCanvas().style.cursor = "pointer"; });
        mapInstance.on("mouseleave", SUBWAY_LAYER_ID, () => { mapInstance.getCanvas().style.cursor = ""; });

        mapInstance.addSource(RIOC_SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        mapInstance.addLayer({
          id: RIOC_LAYER_ID,
          source: RIOC_SOURCE_ID,
          type: "circle",
          layout: { visibility: showRiocRef.current ? "visible" : "none" },
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 5, 14, 10],
            "circle-color": "#d71920",
            "circle-opacity": 1,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });
        mapInstance.on("click", RIOC_LAYER_ID, (event) => {
          const feature = event.features?.[0];
          if (!feature) return;
          new mapboxgl.Popup({ className: styles.mapPopup })
            .setLngLat(feature.geometry.coordinates.slice())
            .setDOMContent(createRiocPopupContent(feature.properties))
            .addTo(mapInstance);
        });
        mapInstance.on("mouseenter", RIOC_LAYER_ID, () => { mapInstance.getCanvas().style.cursor = "pointer"; });
        mapInstance.on("mouseleave", RIOC_LAYER_ID, () => { mapInstance.getCanvas().style.cursor = ""; });

        const refreshMta = async () => {
          try {
            const result = await loadMtaVehicles(controller.signal);
            if (disposed || controller.signal.aborted) return;
            const source = mapInstance.getSource(MTA_SOURCE_ID);
            const nextFeatures = result.geojson.features;
            const previousFeatures = mtaFeaturesRef.current;
            if (mtaAnimationFrame !== undefined) window.cancelAnimationFrame(mtaAnimationFrame);
            const draw = (progress) => {
              if (!source || typeof source.setData !== "function") {
                throw new Error("The MTA map source is unavailable.");
              }
              source.setData({
                type: "FeatureCollection",
                features: interpolateFeatures(previousFeatures, nextFeatures, progress),
              });
            };
            if (previousFeatures.length && nextFeatures.length) {
              const startedAt = window.performance.now();
              const animate = (now) => {
                const progress = Math.min(1, (now - startedAt) / MTA_ANIMATION_MS);
                draw(progress);
                if (progress < 1 && !disposed) mtaAnimationFrame = window.requestAnimationFrame(animate);
              };
              mtaAnimationFrame = window.requestAnimationFrame(animate);
            } else {
              draw(1);
            }
            mtaFeaturesRef.current = nextFeatures;
            setMtaRoutes(routeOptions(nextFeatures));
            setMtaStatus({
              state: result.status,
              count: nextFeatures.length,
              ageSeconds: result.ageSeconds,
              renderedCount: 0,
            });
            mapInstance.once("idle", () => {
              if (disposed) return;
              const renderedCount = mapInstance.queryRenderedFeatures({ layers: [MTA_LAYER_ID] }).length;
              setMtaStatus({
                state: result.status,
                count: nextFeatures.length,
                ageSeconds: result.ageSeconds,
                renderedCount,
              });
            });
          } catch (error) {
            if (error.name !== "AbortError") {
              console.error("Unable to render MTA vehicles", error);
              setMtaStatus({
                state: `error: ${error.message || "unknown error"}`,
                count: 0,
                ageSeconds: null,
                renderedCount: 0,
              });
            }
          }
        };
        const refreshRioc = async () => {
          try {
            const result = await loadRiocVehicles(controller.signal);
            if (disposed || controller.signal.aborted) return;
            const source = mapInstance.getSource(RIOC_SOURCE_ID);
            const nextFeatures = result.geojson.features;
            const previousFeatures = riocFeaturesRef.current;
            if (riocAnimationFrame !== undefined) window.cancelAnimationFrame(riocAnimationFrame);
            const draw = (progress) => source?.setData({
              type: "FeatureCollection",
              features: interpolateFeatures(previousFeatures, nextFeatures, progress),
            });
            if (previousFeatures.length && nextFeatures.length) {
              const startedAt = window.performance.now();
              const animate = (now) => {
                const progress = Math.min(1, (now - startedAt) / MTA_ANIMATION_MS);
                draw(progress);
                if (progress < 1 && !disposed) riocAnimationFrame = window.requestAnimationFrame(animate);
              };
              riocAnimationFrame = window.requestAnimationFrame(animate);
            } else draw(1);
            riocFeaturesRef.current = nextFeatures;
            setRiocStatus({ state: result.status, count: nextFeatures.length, renderedCount: 0 });
            mapInstance.once("idle", () => {
              if (disposed) return;
              setRiocStatus({
                state: result.status,
                count: nextFeatures.length,
                renderedCount: mapInstance.queryRenderedFeatures({ layers: [RIOC_LAYER_ID] }).length,
              });
            });
          } catch (error) {
            if (error.name !== "AbortError") {
              console.error("Unable to render RIOC Red Bus vehicles", error);
              setRiocStatus({ state: `error: ${error.message || "unknown error"}`, count: 0, renderedCount: 0 });
            }
          }
        };
        const refreshSubway = async () => {
          try {
            const result = await loadSubwayVehicles(controller.signal);
            if (disposed || controller.signal.aborted) return;
            const source = mapInstance.getSource(SUBWAY_SOURCE_ID);
            const nextFeatures = result.geojson.features;
            const previousFeatures = subwayFeaturesRef.current;
            if (subwayAnimationFrame !== undefined) window.cancelAnimationFrame(subwayAnimationFrame);
            const draw = (progress) => source?.setData({
              type: "FeatureCollection",
              features: interpolateFeatures(previousFeatures, nextFeatures, progress),
            });
            if (previousFeatures.length && nextFeatures.length) {
              const startedAt = window.performance.now();
              const animate = (now) => {
                const progress = Math.min(1, (now - startedAt) / MTA_ANIMATION_MS);
                draw(progress);
                if (progress < 1 && !disposed) subwayAnimationFrame = window.requestAnimationFrame(animate);
              };
              subwayAnimationFrame = window.requestAnimationFrame(animate);
            } else draw(1);
            subwayFeaturesRef.current = nextFeatures;
            setSubwayRoutes(routeOptions([...subwayRoutesGeojson.features, ...nextFeatures]));
            setSubwayStatus({ state: result.status, count: nextFeatures.length, ageSeconds: result.ageSeconds, renderedCount: 0 });
            mapInstance.once("idle", () => {
              if (disposed) return;
              setSubwayStatus({
                state: result.status,
                count: nextFeatures.length,
                ageSeconds: result.ageSeconds,
                renderedCount: mapInstance.queryRenderedFeatures({ layers: [SUBWAY_LAYER_ID] }).length,
              });
            });
          } catch (error) {
            if (error.name !== "AbortError") {
              console.error("Unable to render MTA Subway trains", error);
              setSubwayStatus({ state: `error: ${error.message || "unknown error"}`, count: 0, ageSeconds: null, renderedCount: 0 });
            }
          }
        };
        // Mark the map ready before the optional live layer arrives. A slow MTA
        // response should never hide the historical Tree11 map.
        setStatus({ state: "ready", count: geojson.features.length, message: "" });
        refreshMta();
        refreshSubway();
        refreshRioc();
        mtaTimer = window.setInterval(refreshMta, MTA_REFRESH_MS);
        subwayTimer = window.setInterval(refreshSubway, SUBWAY_REFRESH_MS);
        riocTimer = window.setInterval(refreshRioc, RIOC_REFRESH_MS);
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
      if (mtaTimer !== undefined) window.clearInterval(mtaTimer);
      if (subwayTimer !== undefined) window.clearInterval(subwayTimer);
      if (riocTimer !== undefined) window.clearInterval(riocTimer);
      if (mtaAnimationFrame !== undefined) window.cancelAnimationFrame(mtaAnimationFrame);
      if (subwayAnimationFrame !== undefined) window.cancelAnimationFrame(subwayAnimationFrame);
      if (riocAnimationFrame !== undefined) window.cancelAnimationFrame(riocAnimationFrame);
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

  function toggleMta() {
    const next = !showMtaRef.current;
    showMtaRef.current = next;
    setShowMta(next);
    if (map.current?.getLayer(MTA_LAYER_ID)) {
      map.current.setLayoutProperty(MTA_LAYER_ID, "visibility", next ? "visible" : "none");
    }
  }

  function changeMtaRoute(event) {
    const next = event.target.value;
    selectedMtaRouteRef.current = next;
    setSelectedMtaRoute(next);
    if (map.current?.getLayer(MTA_LAYER_ID)) map.current.setFilter(MTA_LAYER_ID, mtaRouteFilter(next));
  }

  function toggleRioc() {
    const next = !showRiocRef.current;
    showRiocRef.current = next;
    setShowRioc(next);
    if (map.current?.getLayer(RIOC_LAYER_ID)) {
      map.current.setLayoutProperty(RIOC_LAYER_ID, "visibility", next ? "visible" : "none");
    }
  }

  function toggleSubway() {
    const next = !showSubwayRef.current;
    showSubwayRef.current = next;
    setShowSubway(next);
    [SUBWAY_LAYER_ID, SUBWAY_LABEL_LAYER_ID].forEach((layerId) => {
      if (map.current?.getLayer(layerId)) map.current.setLayoutProperty(layerId, "visibility", next ? "visible" : "none");
    });
  }

  function toggleSubwayRoutes() {
    const next = !showSubwayRoutesRef.current;
    showSubwayRoutesRef.current = next;
    setShowSubwayRoutes(next);
    if (map.current?.getLayer(SUBWAY_ROUTES_LAYER_ID)) {
      map.current.setLayoutProperty(SUBWAY_ROUTES_LAYER_ID, "visibility", next ? "visible" : "none");
    }
  }

  function changeSubwayRoute(event) {
    const next = event.target.value;
    selectedSubwayRouteRef.current = next;
    setSelectedSubwayRoute(next);
    [SUBWAY_LAYER_ID, SUBWAY_LABEL_LAYER_ID].forEach((layerId) => {
      if (map.current?.getLayer(layerId)) map.current.setFilter(layerId, subwayRouteFilter(next));
    });
    if (map.current?.getLayer(SUBWAY_ROUTES_LAYER_ID)) {
      map.current.setFilter(SUBWAY_ROUTES_LAYER_ID, subwayRouteFilter(next));
      map.current.setPaintProperty(SUBWAY_ROUTES_LAYER_ID, "line-opacity", next === "all" ? 0.16 : 0.72);
    }
  }

  return (
    <section className={styles.mapWrapper} aria-label="NYC forestry and live transit map">
      <div className={styles.mapSidebar} aria-live="polite">
        Longitude: {view.longitude} | Latitude: {view.latitude} | Zoom: {view.zoom}
      </div>

      <fieldset className={styles.filterGroup}>
        <legend>Map layers</legend>
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
        <input id="filter-mta" type="checkbox" checked={showMta} onChange={toggleMta} />
        <label htmlFor="filter-mta" className={styles.mtaFilter}>MTA buses</label>
        <input id="filter-rioc" type="checkbox" checked={showRioc} onChange={toggleRioc} />
        <label htmlFor="filter-rioc" className={styles.riocFilter}>RIOC Red Bus</label>
        <label className={styles.routeLabel} htmlFor="mta-route">Bus route</label>
        <select id="mta-route" className={styles.routeSelect} value={selectedMtaRoute} onChange={changeMtaRoute} disabled={!showMta || !mtaRoutes.length}>
          <option value="all">All routes</option>
          {mtaRoutes.map((route) => <option key={route} value={route}>{route}</option>)}
        </select>
        <input id="filter-subway" type="checkbox" checked={showSubway} onChange={toggleSubway} />
        <label htmlFor="filter-subway" className={styles.subwayFilter}>MTA Subway (estimated)</label>
        <input id="filter-subway-routes" type="checkbox" checked={showSubwayRoutes} onChange={toggleSubwayRoutes} />
        <label htmlFor="filter-subway-routes" className={styles.subwayRoutesFilter}>Subway route lines</label>
        <label className={styles.routeLabel} htmlFor="subway-route">Subway line</label>
        <select id="subway-route" className={styles.routeSelect} value={selectedSubwayRoute} onChange={changeSubwayRoute} disabled={!subwayRoutes.length}>
          <option value="all">All lines</option>
          {subwayRoutes.map((route) => <option key={route} value={route}>{route}</option>)}
        </select>
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
        <p className={styles.mapSummary}>{status.count.toLocaleString()} tree records · {showMta ? `${mtaStatus.count.toLocaleString()} buses (${mtaStatus.renderedCount.toLocaleString()} visible)` : "buses hidden"} · {showSubway ? `${subwayStatus.count.toLocaleString()} subway trains estimated (${subwayStatus.renderedCount.toLocaleString()} visible)` : "subway hidden"} · {showRioc ? `${riocStatus.count.toLocaleString()} Red Bus (${riocStatus.renderedCount.toLocaleString()} visible)` : "Red Bus hidden"}</p>
      )}
      <div ref={mapContainer} className={styles.mapContainer} />
    </section>
  );
}
