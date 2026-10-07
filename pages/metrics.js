import React, { useRef, useState } from "react";
import dynamic from "next/dynamic";
import fs from "fs";
import path from "path";
import Header from "../components/header/header"
import Footer from "../components/footer/footer"
import PageHeader from "../components/page-header/page-header";
import { DataStatus, PageIntro } from "../components/editorial/editorial";
import { formatUtcDate } from "../lib/data-status";
import styles from "./styles/home.module.scss";
import metricstyles from "./styles/metric.module.scss";

const chartLoading = () => <p className={metricstyles.chartStatus} role="status">Preparing chart...</p>;
const SRMetric = dynamic(() => import("../components/charts/SRMetrics"), { ssr: false, loading: chartLoading });
const WOMetric = dynamic(() => import("../components/charts/WOMetrics"), { ssr: false, loading: chartLoading });
const InsMetric = dynamic(() => import("../components/charts/InsMetrics"), { ssr: false, loading: chartLoading });

export default function Metrics({ datasetStatus }) {
  const [activeTab, setActiveTab] = useState(1)
  const tabRefs = useRef([])
  const selectTab = (tab) => {
    setActiveTab(tab)
    tabRefs.current[tab - 1]?.focus()
  }
  const onTabKeyDown = (event) => {
    const keys = { ArrowRight: activeTab === 3 ? 1 : activeTab + 1, ArrowLeft: activeTab === 1 ? 3 : activeTab - 1, Home: 1, End: 3 }
    if (keys[event.key]) { event.preventDefault(); selectTab(keys[event.key]) }
  }
  const renderTab = () => {
    switch (activeTab) {
      case 1:
        return <SRMetric />
      case 2:
        return <InsMetric />;
      case 3:
        return <WOMetric />;
      default:
        return null;
    }
  };
  
  return (
    <div className={styles.homeContainer}>
      <Header canonicalPath="/metrics" description="Compare six months of NYC forestry service requests, inspections, work orders, and published data quality." pageTitle="Metrics" />
      <main className={styles.main}>
        <PageHeader accent="Metrics" />
        <section className={styles.metric}>
          <PageIntro eyebrow="Operational trends" title="Explore six months of forestry activity">
            <p>Switch between service requests, inspections, and work orders. Each view uses the latest published Tree11 dataset and includes an accessible data table.</p>
          </PageIntro>
          <DataStatus items={datasetStatus} label="Metrics dataset status" />
          <div className={metricstyles.actions} aria-label="Data downloads">
            <span>Use the chart tabs for comparison or inspect the processed source files.</span>
            <a href="/data/summary.json" download>Summary JSON ↓</a>
            <a href="/data/map/points.geojson" download>Map GeoJSON ↓</a>
          </div>
          <div className={metricstyles.buttonContainer} role="tablist" aria-label="Forestry metrics">
            <button ref={node => { tabRefs.current[0] = node }} tabIndex={activeTab === 1 ? 0 : -1} onKeyDown={onTabKeyDown} id="tab-service-requests" role="tab" aria-selected={activeTab === 1} aria-controls="metrics-panel" className={[metricstyles.button, 1 === activeTab ? metricstyles.active : ''].join(' ')} onClick={() => setActiveTab(1)}>SERVICE REQUESTS</button>
            <button ref={node => { tabRefs.current[1] = node }} tabIndex={activeTab === 2 ? 0 : -1} onKeyDown={onTabKeyDown} id="tab-inspections" role="tab" aria-selected={activeTab === 2} aria-controls="metrics-panel" className={[metricstyles.button, 2 === activeTab ? metricstyles.active : ''].join(' ')} onClick={() => setActiveTab(2)}>INSPECTIONS</button>
            <button ref={node => { tabRefs.current[2] = node }} tabIndex={activeTab === 3 ? 0 : -1} onKeyDown={onTabKeyDown} id="tab-work-orders" role="tab" aria-selected={activeTab === 3} aria-controls="metrics-panel" className={[metricstyles.button, 3 === activeTab ? metricstyles.active : ''].join(' ')} onClick={() => setActiveTab(3)}>WORK ORDERS</button>
          </div>
          <div className={metricstyles.panel} id="metrics-panel" role="tabpanel" aria-labelledby={activeTab === 1 ? "tab-service-requests" : activeTab === 2 ? "tab-inspections" : "tab-work-orders"}>
            {renderTab()}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export async function getStaticProps() {
  const dataDir = path.join(process.cwd(), "public", "data");
  const summary = JSON.parse(fs.readFileSync(path.join(dataDir, "summary.json"), "utf8"));

  return {
    props: {
      datasetStatus: [
        {
          label: "Reporting period",
          value: `${summary.reporting_period.start_month} — ${summary.reporting_period.end_month}`,
          detail: "Completed months only",
        },
        {
          label: "Source data through",
          value: formatUtcDate(summary.data_through),
          detail: "UTC",
        },
        {
          label: "Published",
          value: formatUtcDate(summary.generated_at),
          detail: `Snapshot ${summary.snapshot_id.replace("state-", "").slice(0, 8)}`,
        },
        {
          label: "Validation",
          value: summary.validation_status === "valid" ? "Validated" : "Review needed",
          detail: `${summary.refresh.data_mode} source data`,
        },
      ],
    },
  };
}
