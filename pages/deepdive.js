import dynamic from "next/dynamic";
import Link from "next/link";
import fs from "fs";
import path from "path";

import { DataStatus, PageIntro, SectionHeading } from "../components/editorial/editorial";
import Footer from "../components/footer/footer";
import Header from "../components/header/header";
import PageHeader from "../components/page-header/page-header";
import { formatUtcDate } from "../lib/data-status";
import styles from "./styles/deepdive.module.scss";

const Map = dynamic(() => import("../components/map/map"), {
  ssr: false,
  loading: () => <div className={styles.mapPlaceholder}>Preparing map...</div>,
});

const PendingWorkOrdersChart = dynamic(() => import("../components/charts/PendingWorkOrdersChart"), {
  ssr: false,
  loading: () => <div className={styles.chartPlaceholder}>Preparing chart...</div>,
});

const formatNumber = (value) => Number(value || 0).toLocaleString("en-US");
const formatPercent = (value, total) => total ? `${((value / total) * 100).toFixed(1)}%` : "—";

function VizTitle({ children }) {
  return <h3 className={styles.vizTitle}>{children}</h3>;
}

export default function Deepdive({ pendingWorkOrders, summary, manifest }) {
  const requestCount = summary.lifecycle.request_count;
  const lifecycleStages = [
    {
      number: "01",
      title: "Service requests",
      count: requestCount,
      rate: "Starting population",
      description: "Reports submitted through 311, NYC Parks, the Street Tree Map, and internal agency channels.",
      href: "https://storymaps.arcgis.com/stories/5353de3dea91420faaa7faff0b32206b#ref-n-ZPpns4",
    },
    {
      number: "02",
      title: "Linked to inspection",
      count: summary.lifecycle.requests_with_inspection,
      rate: `${formatPercent(summary.lifecycle.requests_with_inspection, requestCount)} of requests`,
      description: "Requests matched to at least one forestry inspection in the published lifecycle dataset.",
      href: "https://storymaps.arcgis.com/stories/5353de3dea91420faaa7faff0b32206b#ref-n-KyfZeu",
    },
    {
      number: "03",
      title: "Linked to work order",
      count: summary.lifecycle.requests_with_work_order,
      rate: `${formatPercent(summary.lifecycle.requests_with_work_order, requestCount)} of requests`,
      description: "Requests matched to at least one resulting work order in the current analysis window.",
      href: "https://storymaps.arcgis.com/stories/5353de3dea91420faaa7faff0b32206b#ref-n-ntq7kY",
    },
  ];

  const datasetStatus = [
    {
      label: "Analysis window",
      value: `${summary.reporting_period.start_month} — ${summary.reporting_period.end_month}`,
      detail: "Completed reporting months",
    },
    {
      label: "Source data through",
      value: formatUtcDate(summary.data_through),
      detail: "UTC",
    },
    {
      label: "Lifecycle records",
      value: formatNumber(requestCount),
      detail: "Service-request records analyzed",
    },
    {
      label: "Relationship note",
      value: "Observed links",
      detail: "Unmatched records do not prove that no activity occurred",
    },
  ];

  return (
    <div className={styles.container}>
      <Header canonicalPath="/deepdive" description="Follow observed NYC forestry service requests through inspections and work orders with lifecycle and geographic context." pageTitle="Data Deepdive" />
      <main className={styles.main}>
        <PageHeader accent="Deepdive" showDescription />
        <PageIntro eyebrow="Lifecycle analysis" title="Follow a forestry request from report to agency action.">
          <p>Tree11 links public service requests to inspections and work orders where the published identifiers support a defensible match. Counts describe observed links, not guaranteed final outcomes.</p>
        </PageIntro>
        <DataStatus items={datasetStatus} label="Deepdive dataset status" />

        <section className={styles.dataGrid}>
          <section className={styles.mapSection} aria-labelledby="case-map-title">
            <SectionHeading eyebrow="Geographic context" id="case-map-title" title="Published request locations">
              <p>Use the map layers to compare forestry records with live transit context. Displayed records are capped for browser performance.</p>
            </SectionHeading>
            <div className={styles.dataVizMap}><Map /></div>
          </section>

          <div className={styles.rightCol}>
            <section aria-labelledby="workload-title">
              <SectionHeading eyebrow="Current workload" id="workload-title" title="Pending work orders by type">
                <p>Tree hazards, damaged limbs, planting, sidewalk conflicts, and permit requests create different types of forestry work.</p>
              </SectionHeading>
              <div className={styles.dataVizGraph}>
                <div className={styles.lineGraph}>
                  <VizTitle>Pending work orders by type</VizTitle>
                  <PendingWorkOrdersChart data={pendingWorkOrders} />
                </div>
              </div>
            </section>

            <section className={styles.lifecycleSection} aria-labelledby="lifecycle-title">
              <SectionHeading eyebrow="Observed pathway" id="lifecycle-title" title="The service-request lifecycle">
                <p>A request can receive direct action, remain open, be closed without an inspection, or fail to match another public record. The stages below show only links present in the published data.</p>
              </SectionHeading>
              <div className={styles.lifecycleGrid}>
                {lifecycleStages.map((stage) => (
                  <a className={styles.stageCard} href={stage.href} target="_blank" rel="noopener noreferrer" key={stage.number}>
                    <span className={styles.stageNumber}>{stage.number}</span>
                    <strong>{formatNumber(stage.count)}</strong>
                    <h3>{stage.title}</h3>
                    <small>{stage.rate}</small>
                    <p>{stage.description}</p>
                    <b aria-hidden="true">Read NYC Parks context ↗</b>
                  </a>
                ))}
              </div>
            </section>

            <section className={styles.detailSection} aria-labelledby="interpret-title">
              <SectionHeading eyebrow="How to interpret it" id="interpret-title" title="Counts at each operational stage" />
              <div className={styles.detailStack}>
                <article className={styles.card}>
                  <h3>Requests describe demand</h3>
                  <strong className={styles.detailNumber}>{formatNumber(manifest.datasets.service_requests.rows)}</strong>
                  <p>Residents and agencies can submit forestry requests through several systems. Multiple reports may describe the same place or condition, so request totals are not a count of unique trees.</p>
                </article>
                <article className={styles.card}>
                  <h3>Inspections document assessment</h3>
                  <strong className={styles.detailNumber}>{formatNumber(summary.inspections_in_period)}</strong>
                  <p>Forestry specialists evaluate conditions, jurisdiction, location, and urgency. An inspection may produce a work order, a referral, a waitlist decision, or no further recorded action.</p>
                </article>
                <article className={styles.card}>
                  <h3>Work orders describe planned work</h3>
                  <strong className={styles.detailNumber}>{formatNumber(manifest.datasets.work_orders.rows)}</strong>
                  <p>Work orders represent agency tasks, not necessarily completed work. They may be prioritized, reassigned, referred to another agency, or completed after the reporting window.</p>
                </article>
              </div>
            </section>

            <aside className={styles.researchNote}>
              <strong>Method note</strong>
              <p>Tree11 uses NYC Open Data and retained snapshots. Open cases are right-censored, and unmatched relationships are not treated as proof that no inspection or work occurred.</p>
              <Link href="/intro">Read the project methodology →</Link>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export async function getStaticProps() {
  const dataDir = path.join(process.cwd(), "public", "data");
  return {
    props: {
      pendingWorkOrders: JSON.parse(fs.readFileSync(path.join(dataDir, "charts", "pending_work_orders_by_type.json"), "utf8")),
      summary: JSON.parse(fs.readFileSync(path.join(dataDir, "summary.json"), "utf8")),
      manifest: JSON.parse(fs.readFileSync(path.join(dataDir, "manifest.json"), "utf8")),
    },
  };
}
