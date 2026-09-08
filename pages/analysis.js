import fs from "fs";
import path from "path";
import Header from "../components/header/header";
import Footer from "../components/footer/footer";
import PageHeader from "../components/page-header/page-header";
import styles from "./styles/deepdive.module.scss";

const number = value => value === null || value === undefined ? "Not available" : typeof value === "number" ? value.toLocaleString(undefined, {maximumFractionDigits: 1}) : value;

export default function Analysis({overview, backlog, funnel, cohorts, geography, quality}) {
  return <div className={styles.container}><Header pageTitle="Operations Analysis" /><main className={styles.main}><PageHeader accent="Operations Analysis" />
    <section className={styles.rightCol}><h2 className={styles.header_sub}>Operational overview</h2><p className={styles.paragraph}>Accepted observation: {overview.observation_end}. Open endpoints are right-censored; timing values describe completed observations only.</p>
    <div className={styles.grid}>{[["Requests",overview.request_count],["Inspections",overview.inspection_count],["Work orders",overview.work_order_count],["Open request backlog",backlog.open_requests]].map(([label,value])=><div className={styles.card} key={label}><h3>{label}</h3><span className={styles.numbersBig}>{number(value)}</span></div>)}</div>
    <h2 className={styles.header_sub}>Lifecycle funnel</h2><div className={styles.card}>{funnel.stages.map(stage=><p key={stage.stage}><strong>{stage.stage.replaceAll("_"," ")}:</strong> {number(stage.count)} ({stage.percentage_of_requests === null ? "Not available" : `${(stage.percentage_of_requests*100).toFixed(1)}% of requests`})</p>)}</div>
    <h2 className={styles.header_sub}>Backlog and aging</h2><div className={styles.card}><p>Median open age: {number(backlog.age_hours.median)} hours. P90: {number(backlog.age_hours.p90)} hours.</p>{Object.entries(backlog.aging_buckets).map(([bucket,count])=><p key={bucket}>{bucket}: {count}</p>)}</div>
    <h2 className={styles.header_sub}>Cohort coverage</h2><div className={styles.card}><p>{cohorts.note}</p>{cohorts.rows.slice(-5).map(row=><p key={`${row.cohort_month}-${row.horizon_days}`}>{row.cohort_month}, {row.horizon_days}d: eligible {String(row.eligible_for_horizon)}, observed N {row.observed_count}</p>)}</div>
    <h2 className={styles.header_sub}>Geographic coverage</h2><div className={styles.card}>{geography.rows.length ? geography.rows.map(row=><p key={row.geography}>{row.geography}: {number(row.request_count)} requests; {row.suppressed ? "small-group statistics suppressed" : `${number(row.open_backlog)} open`}</p>) : <p>No validated administrative geography is available in this artifact.</p>}</div>
    <h2 className={styles.header_sub}>Data-quality coverage</h2><div className={styles.card}><p>Orphan relationships: {number(quality.orphan_relationship_count)}. Invalid coordinates: {number(quality.invalid_coordinates)}.</p><p>Tree11 retained-observation history starts with its first accepted snapshot; it is not a reconstructed daily operational history.</p></div>
  </section></main><Footer /></div>;
}
export async function getStaticProps() { const data=path.join(process.cwd(),"public","data"); const read=file=>JSON.parse(fs.readFileSync(path.join(data,file),"utf8")); return {props:{overview:read("research/overview.json"),backlog:read("research/backlog.json"),funnel:read("research/lifecycle_funnel.json"),cohorts:read("research/cohorts.json"),geography:read("research/geography.json"),quality:read("quality/current.json")}}; }
