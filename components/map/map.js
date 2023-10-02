import React, { useRef, useEffect, useState } from "react";
import styles from "./map.module.scss";
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax

// import css from "styled-jsx/css";

mapboxgl.accessToken =
  "pk.eyJ1IjoiZGFhbnZhbmRlcnp3YWFnIiwiYSI6ImNrdHVhOXBpMDF5YzAybm1oM3gzbTBmYWMifQ.CW1kG74nME-J1VZNULhrWw";

export default function Map() {
  const mapContainer = useRef(null);
  const map = useRef(null);

  const [lng, setLng] = useState(-73.98);
  const [lat, setLat] = useState(40.698);
  const [zoom, setZoom] = useState(11);

  //  Function: fetch async from API and do some cleaning
  async function getLocation(updateSource) {
    // Make a GET request to the API and return the geojson file
    try {
      const response = await fetch(
        // Examples for external API:
        // "https://data.cityofnewyork.us/resource/mu46-p9is.geojson",
        // "https://data.cityofnewyork.us/resource/erm2-nwe9.geojson?agency=DPR", // filter for DPR
        // Fetch from our API.

        "/tree11_collection.geojson" // api/data
      );
      // get response
      const data = await response.json();

      // Function: clean data and check for null, remove and set limit/filter to 900 entries as failsave
      const cleanData = function (d) {
        const nonNullData = d
          .filter((feature) => feature.geometry !== null)
          .slice(0, 2400); // filter amount!!
        return nonNullData;
      };

      const cleanedData = cleanData(data.features);
      console.log("cleanedData", cleanedData);
      // Function: set cleaned data in right format for mapbox 🥸

      const allPoints = cleanedData.map((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: point.geometry.coordinates,
        },
        properties: point.properties,
      }));

      // Return the locations as GeoJSON.
      return {
        type: "FeatureCollection",
        features: allPoints,
      };
    } catch (err) {
      // If the updateSource interval is defined, clear the interval to stop updating the source.
      if (updateSource) clearInterval(updateSource);
      throw new Error(err);
    }
  }
  // React: trigged if components is finsihed with rendering
  useEffect(() => {
    if (map.current) return; // initialize map only once

    // Feat: initiate map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/daanvanderzwaag/cktupvbr41j0x17pb0cz0awwp",
      center: [lng, lat],
      zoom: zoom,
    });

    // Get DOM element of filters
    const filterGroup = document.getElementById("filter-group");

    // Check: see if there are no multiple maps rendered, to be sure delete all layers in that case
    if (map.current.getLayer("311-report")) {
      map.current.removeSource("311-data");
      map.current.removeLayer("311-report");
    }

    // Feat: set moving controls
    map.current.on("move", () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });

    map.current.on("load", async () => {
      // Style: responsive map

      map.current.resize();

      // Get the initial data from API (see getLocation())
      const geojson = await getLocation();

      // Add the API results as data source
      map.current.addSource("311-data", {
        type: "geojson",
        data: geojson,
        // cluster: true,
        // clusterMaxZoom: 12, // Max zoom to cluster points on
        // clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
      });

      // Feat: toggle locations per bourough
      for (const feature of geojson.features) {
        // Set filter on property type, in our case the borough
        // NOTE: set same as `filter: ["==", "boroughcode", borough]`

        const borough = feature.properties.boroughcode;
        const layerID = `id-${borough}`;


        // Add a layer for this symbol type if it hasn't been added already.
        if (!map.current.getLayer(layerID)) {
          map.current.addLayer({
            id: layerID,
            source: "311-data",
            type: "circle",
            paint: {
              "circle-radius": 5,
              "circle-color": "#ffe600",
            },
            filter: ["==", "boroughcode", borough],
          });

          // Add checkbox and label elements for the layer.
          const input = document.createElement("input");
          input.type = "checkbox";
          input.id = layerID;
          input.checked = true;
          filterGroup.appendChild(input);

          const label = document.createElement("label");

          label.setAttribute("for", layerID);
          label.textContent = borough;
          filterGroup.appendChild(label);

          // When the checkbox changes, update the visibility of the layer.
          input.addEventListener("change", (e) => {
            map.current.setLayoutProperty(
              layerID,
              "visibility",
              e.target.checked ? "visible" : "none"
            );
          });
        }
      }
    });
    // Feat: loader - hide loading bar once tiles from geojson are loaded
    map.current.on("data", function (e) {
      if (e.dataType === "source" && e.sourceId === "311-data") {
        document.getElementById("loader").style.visibility = "hidden";
      }
    });

    // Set IDS for easy access for interactitvy
    const plottedElements = [
      "id-Manhattan",
      "id-Bronx",
      "id-Brooklyn",
      "id-Harlem",
      "id-Queens",
      "id-Staten Island",
      "unclustered-point",
      "clusters",
    ];

    // Feat: When a click event occurs on a feature in the unclustered-point layer, open a popup at the location of the feature, with description HTML from its properties.
    map.current.on("click", [...plottedElements], (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice();

      map.current.easeTo({
        center: coordinates,
        zoom: zoom,
      });

      // Get 'all relevent' properties from passed data e.g street, time, date etc.
      const allFeatureInfo = e.features[0].properties;

      // Chore: Ensure that if the map is zoomed out such that multiple copies of the feature are visible, the  popup appears over the copy being pointed to.
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      // Show HTML inside popup
      new mapboxgl.Popup({ className: styles.mapPopup })
        .setLngLat(coordinates)
        .setHTML(
          `<div>
            <ul>
              <li>
                <span>SR Category</span>
                <span>${allFeatureInfo.srcategory}</span>
              </li>
              <li>
                <span>SR Type</span>
                <span>${allFeatureInfo.srtype}</span>
              </li>
              <li>
                <span>SR Resolution</span>
                <span>${allFeatureInfo.srresolution}</span>
              </li>
              <li>
                <span>Status</span>
                <span>${allFeatureInfo.srstatus}</span>
              </li>
              <li>
                <span>Risk Rating</span>
                <span>${allFeatureInfo.riskrating}</span>
              </li>
              <li>
                <span>Request Creation Date</span>
                <span>${allFeatureInfo.SRCreatedDate}</span>
              </li>
              <li>
                <span>Request Closed Date</span>
                <span>${allFeatureInfo.SRClosedDate}</span>
              </li>
              <li>
                <span>WO Type</span>
                <span>${allFeatureInfo.wotype}</span>
              </li>
            </ul>

        </div>`
        )
        .addTo(map.current);
    });

    // Feat: toggle mouse as pointer for UX
    map.current.on("mouseenter", [...plottedElements], () => {
      map.current.getCanvas().style.cursor = "pointer";
    });
    map.current.on("mouseleave", [...plottedElements], () => {
      map.current.getCanvas().style.cursor = "";
    });

    // Feat: Update the source from the API every ~30minutes
    const updateSource = setInterval(async () => {
      const geojson = await getLocation(updateSource);
      map.current.getSource("311DataFresh").setData(geojson);
    }, 86400000); // interval reloads every 24 hours
  });

  return (
    <div className={styles.mapWrapper}>
      <div className={styles.mapSidebar}>
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>

      <nav id="filter-group" className={styles.filterGroup}></nav>
      <div className={styles.mapLoader} id="loader">
        <p>
          Loading the trees <span>🍃</span>{" "}
        </p>
      </div>
      <div ref={mapContainer} className={styles.mapContainer} />
    </div>
  );
}
