import Header from "../components/header/header";
import Footer from "../components/footer/footer";
import PageHeader from "../components/page-header/page-header";
// import LineChart from "../components/charts/LineChart";
import dynamic from "next/dynamic";
import fs from "fs";
import path from "path";
import { useEffect, useState } from "react";
import { refreshAge, formatUtc } from "../lib/data-status";

import styles from "./styles/home.module.scss";

// Mapbox owns and mutates a WebGL canvas. Rendering it only in the browser
// keeps its DOM outside React's server/client hydration boundary.
const Map = dynamic(() => import("../components/map/map"), {
  ssr: false,
  loading: () => <div className={styles.mapLoadingPlaceholder} role="status">Preparing map…</div>,
});

// Canvas charts and live network widgets are mounted only in the browser.
// Their output changes after page generation, so SSR would otherwise make React
// compare static build-time markup with a live client render.
const WeatherContext = dynamic(() => import("../components/weather/WeatherContext"), { ssr: false });
const LiveStreamCard = dynamic(() => import("../components/streaming/LiveStreamCard"), { ssr: false });
const StackedBarChart = dynamic(() => import("../components/charts/StackedBarChart"), {
  ssr: false,
  loading: () => <div className={styles.chartLoadingPlaceholder} role="status">Preparing chart...</div>,
});

const formatNumber = (value) => Number(value || 0).toLocaleString("en-US");

function VizTitle({ children, color }) {
  return (
    <div className={styles.vizTitle}>
      <h3 style={{ color: color }}>{children}</h3>
    </div>
  );
}
function RefreshDashboard({ summary, manifest, trend }) {
  const refresh = manifest.refresh || summary.refresh || {};
  const refreshed = refresh.ended_at;
  const [state, setState] = useState("Checking refresh age");
  useEffect(() => {
    const update = () => setState(refreshAge(refreshed));
    const initial = setTimeout(update, 0);
    const timer = setInterval(update, 60 * 1000);
    const onVisible = () => { if (!document.hidden) update(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(initial); clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [refreshed]);
  const mode = refresh.data_mode || "unknown";
  const change = summary.change_counts || {};
  const rows = manifest.source_rows || {};
  const period = summary.reporting_period || {};
  return <section className={styles.refreshDashboard} aria-label="Dataset refresh status">
    <div><span className={styles.refreshLabel}>Update process</span><strong>{refresh.status === "success" ? "Succeeded" : refresh.status || "Unknown"}</strong><small>Last process completion: {formatUtc(refreshed)}</small><small aria-live="polite">{state}</small></div>
    <div><span className={styles.refreshLabel}>Data coverage (UTC)</span><strong>{formatUtc(manifest.data_through || summary.data_through)}</strong><small>Latest source event date; a successful refresh does not guarantee current or complete coverage.</small></div>
    <div><span className={styles.refreshLabel}>Reporting period</span><strong>{period.start_month && period.end_month ? `${period.start_month} to ${period.end_month}` : summary.last_complete_month || "Unavailable"}</strong><small>{period.complete_months_only ? "Monthly reporting includes completed months only." : "Reporting-period policy unavailable."}</small></div>
    <div><span className={styles.refreshLabel}>Dataset type</span><strong className={mode !== "live" ? styles.stale : ""}>{mode === "fixture" ? "Test data (fixture)" : mode === "live" ? "Source data" : "Unverified provenance"}</strong><small>{mode === "fixture" ? "Synthetic sample for testing; does not represent NYC totals." : "Coverage and record counts describe this published dataset."}</small></div>
    <div><span className={styles.refreshLabel}>Source records</span><strong>{formatNumber(Object.values(rows).reduce((a, b) => a + b, 0))}</strong><small>{Object.entries(rows).map(([name, count]) => `${name.replaceAll("_", " ")}: ${formatNumber(count)}`).join(" · ")}</small></div>
    <div><span className={styles.refreshLabel}>Latest changes</span><strong>+{change.added || 0} / ~{change.changed || 0} / −{change.removed || 0}</strong><small>Added / changed / removed</small></div>
    <div><span className={styles.refreshLabel}>Recent refreshes</span><strong>{trend.labels?.length || 0} retained</strong><small>{trend.labels?.slice(-3).join(" · ") || "No history available"}</small></div>
  </section>;
}
export default function Home({ summary, srBySource, manifest, trend, lifecycle }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!mounted) {
    return (
      <div className={styles.homeContainer}>
        <Header pageTitle="Home" />
        <main className={styles.initialLoading} aria-busy="true">
          <span>Loading NYC Tree11...</span>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.homeContainer}>
      <Header pageTitle="Home" />
      <main className={styles.main}>
        <PageHeader showDescription />
        <WeatherContext />
        <section className={styles.dataGrid}>
          <div className={styles.dataVizMap}>
            <Map />
          </div>
          <div className={styles.rightCol}>
            <div className={styles.dataVizTop}>
              <VizTitle color="#fff">
                % of Service Requests Yielding an Inspection or a Work Order
              </VizTitle>
              <p className={styles.paragraph_long}>Source-event lifecycle metrics: {formatNumber(lifecycle.request_count)} requests; {formatNumber(lifecycle.requests_with_inspection)} linked to an inspection; {formatNumber(lifecycle.requests_with_work_order)} linked to a work order.</p>
              <p className={styles.paragraph_long}>Median request to first inspection: {lifecycle.median_request_to_inspection_hours == null ? "not yet available" : `${lifecycle.median_request_to_inspection_hours.toFixed(1)} hours`}. Timing uses source event fields where available; retained observation history begins when Tree11 snapshots are collected.</p>
            </div>
            <div className={styles.dataVizLine}>
              <div className={styles.lineNumbers}>
                <div className={styles.numberWrapper}>
                  <span className={styles.numbersBig}>{formatNumber(summary.last_month_requests)}</span>
                  <p>
                    <span className={styles.numbersTag}>
                      requests in {summary.last_complete_month || "the last complete month"}
                    </span>
                  </p>
                </div>
                <div className={styles.numberWrapper}>
                  <span className={styles.numbersBig}>{formatNumber(summary.uninspected_requests)}</span>
                  <p>
                    <span className={styles.numbersTag}>uninspected</span>
                  </p>
                </div>
                <div className={styles.numberWrapper}>
                  <span className={styles.numbersBig}>{formatNumber(summary.inspections_in_period)}</span>
                  <p>
                    <span className={styles.numbersTag}>inspections in the analysis period</span>
                  </p>
                </div>
              </div>
            </div>
            <section className={styles.dataGrid}>
            <div>
                  <h2 className={styles.header_sub}>Where Do Service Requests Come From?</h2>
                  <p className={styles.paragraph_long}>
                    To report street and park tree conditions: call 311, go to the
                    311 website, report through the NYC Parks website, or
                    select a tree on the NYC Street Tree Map and click on the
                    &quot;Report Problem&quot; tab.
                  </p>
                  <p className={styles.paragraph_long}>
                    Requests submitted by the public are one of many sources of
                    NYC Park&apos;s workload both for street and park trees. 
                    Mouse over different colors on the graph to learn about other places requests can come from. 
                  </p>
                  <p></p>
                  <div className={styles.dataVizTop}>
                    <VizTitle color="#fff">Monthly Service Requests by Source</VizTitle>
                    <StackedBarChart stacked={true} data={srBySource} />
                    <p className={styles.paragraph_long}>Source data through {summary.data_through ? formatUtc(summary.data_through) : "the latest source record"}. Charts use completed months through {summary.last_complete_month || "the latest completed month"}. Last refresh: {formatUtc(summary.refresh?.ended_at)}.</p>
                    <p className={styles.paragraph_long}><a href="/data/map/points.geojson" download>Download processed map data (GeoJSON; up to {summary.map_feature_limit ? formatNumber(summary.map_feature_limit) : "5,000"} requests from the reporting month)</a></p>
                  </div>
                </div></section>
                
          </div>
        </section>
        <RefreshDashboard summary={summary} manifest={manifest} trend={trend} />
        <LiveStreamCard />
      </main>
      <Footer />
    </div>
  );
}

export async function getStaticProps() {
  const dataDir = path.join(process.cwd(), "public", "data");
  const summary = JSON.parse(fs.readFileSync(path.join(dataDir, "summary.json"), "utf8"));
  return { props: {
    summary,
    srBySource: JSON.parse(fs.readFileSync(path.join(dataDir, "charts", "service_requests_by_source.json"), "utf8")),
    manifest: JSON.parse(fs.readFileSync(path.join(dataDir, "manifest.json"), "utf8")),
    trend: JSON.parse(fs.readFileSync(path.join(dataDir, "history", "trend.json"), "utf8")),
    lifecycle: JSON.parse(fs.readFileSync(path.join(dataDir, "history", "lifecycle_summary.json"), "utf8")),
  }};
}
