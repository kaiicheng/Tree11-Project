import React, { useRef, useState } from "react";
import Header from "../components/header/header"
import Footer from "../components/footer/footer"
import PageHeader from "../components/page-header/page-header";
import styles from "./styles/home.module.scss";
import metricstyles from "./styles/metric.module.scss";
import SRMetric from "../components/charts/SRMetrics"
import WOMetric from "../components/charts/WOMetrics";
import InsMetric from "../components/charts/InsMetrics";

export default function Home() {
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
      <Header pageTitle="Metrics"/>
      <main className={styles.main}>
        <PageHeader accent="Metrics" />
        <section className={styles.metric}>
          <div className={metricstyles.buttonContainer} role="tablist" aria-label="Forestry metrics">
            <button ref={node => { tabRefs.current[0] = node }} tabIndex={activeTab === 1 ? 0 : -1} onKeyDown={onTabKeyDown} id="tab-service-requests" role="tab" aria-selected={activeTab === 1} aria-controls="metrics-panel" className={[metricstyles.button, 1 === activeTab ? metricstyles.active : ''].join(' ')} onClick={() => setActiveTab(1)}>SERVICE REQUESTS</button>
            <button ref={node => { tabRefs.current[1] = node }} tabIndex={activeTab === 2 ? 0 : -1} onKeyDown={onTabKeyDown} id="tab-inspections" role="tab" aria-selected={activeTab === 2} aria-controls="metrics-panel" className={[metricstyles.button, 2 === activeTab ? metricstyles.active : ''].join(' ')} onClick={() => setActiveTab(2)}>INSPECTIONS</button>
            <button ref={node => { tabRefs.current[2] = node }} tabIndex={activeTab === 3 ? 0 : -1} onKeyDown={onTabKeyDown} id="tab-work-orders" role="tab" aria-selected={activeTab === 3} aria-controls="metrics-panel" className={[metricstyles.button, 3 === activeTab ? metricstyles.active : ''].join(' ')} onClick={() => setActiveTab(3)}>WORK ORDERS</button>
          </div>
          <div id="metrics-panel" role="tabpanel" aria-labelledby={activeTab === 1 ? "tab-service-requests" : activeTab === 2 ? "tab-inspections" : "tab-work-orders"}>
            {renderTab()}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
