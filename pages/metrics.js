import React, { useEffect, useRef, useState } from "react";
import Header from "../components/header/header"
import Footer from "../components/footer/footer"
import Button from "../components/buttons/buttons"
import styles from "./styles/home.module.scss";
import metricstyles from "./styles/metric.module.scss";
import SRMetric from "../components/charts/SRMetrics"
import WOMetric from "../components/charts/WOMetrics";
import InsMetric from "../components/charts/InsMetrics";

function VizTitle({ children, color }) {
  return (
    <div className={styles.vizTitle}>
      <h3 style={{ color: color }}>{children}</h3>
    </div>
  );
}
export default function Home() {
  const [activeTab, setActiveTab] = useState(1)
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
      <Header pageTitle="Home"/>
      <link
        href="https://api.tiles.mapbox.com/mapbox-gl-js/v1.2.0/mapbox-gl.css"
        rel="stylesheet"
      />
      <main className={styles.main}>
        <section className={styles.rowInfo}>
          <div className={styles.columnTitle}>
            <h1 className={styles.title}>
              NYC <span>Tree11</span>
            </h1>
          </div>
          <div className={styles.columnInfo}>
            <div className={styles.navigation}>
              <nav>
                <Button href={"/"}>Home</Button>
                <Button href={"/intro"}>About</Button>
                <Button href={"/metrics"}>Metrics</Button>
                <Button href={"/deepdive"}>Deepdive</Button>
              </nav>
              <Button href={"/get-involved"}>Get Involved</Button>
            </div>
          </div>
        </section>
        <section className={styles.metric}>
          <div className={metricstyles.buttonContainer}>
            <button className={[metricstyles.button, 1 === activeTab ? metricstyles.active : ''].join(' ')} onClick={() => setActiveTab(1)}>SERVICE REQUESTS</button>
            <button className={[metricstyles.button, 2 === activeTab ? metricstyles.active : ''].join(' ')} onClick={() => setActiveTab(2)}>INSPECTIONS </button>
            <button className={[metricstyles.button, 3 === activeTab ? metricstyles.active : ''].join(' ')} onClick={() => setActiveTab(3)}>WORK ORDERS</button>
          </div>
          <div >
            {renderTab()}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
