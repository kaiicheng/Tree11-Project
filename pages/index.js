import Header from "../components/header/header";
import Footer from "../components/footer/footer";
import Button from "../components/buttons/buttons";
import StackedBarChart from "../components/charts/StackedBarChart";
import { sr_by_source } from "../data/dataCharts.js";
// import LineChart from "../components/charts/LineChart";
import Map from "../components/map/map";
import { sr_to_insp_or_wo, static_data } from "../data/dataCharts.js";

import styles from "./styles/home.module.scss";

function VizTitle({ children, color }) {
  return (
    <div className={styles.vizTitle}>
      <h3 style={{ color: color }}>{children}</h3>
    </div>
  );
}
export default function Home() {
  return (
    <div className={styles.homeContainer}>
      <Header pageTitle="Home" />
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
            <p className={styles.paragraph}>
              Collaboration between cornell tech and NYCDPR
              focused on visualization, communication, and contextualization of public data to
              bring new yorkers insight into how forestry service requests
              are addressed by the new york city department of parks and recreaction.
            </p>
          </div>
        </section>
        <section className={styles.dataGrid}>
          <div className={styles.dataVizMap}>
            <Map />
          </div>
          <div className={styles.rightCol}>
            <div className={styles.dataVizTop}>
              <VizTitle color="#fff">
                % of Service Requests Yielding an Inspection or a Work Order
              </VizTitle>
              <StackedBarChart data={sr_to_insp_or_wo} />
            </div>
            <div className={styles.dataVizLine}>
              <div className={styles.lineNumbers}>
                <div className={styles.numberWrapper}>
                  <span className={styles.numbersBig}>{static_data.last_month_requests}</span>
                  <p>
                    <span className={styles.numbersTag}>
                      requests last month
                    </span>
                  </p>
                </div>
                <div className={styles.numberWrapper}>
                  <span className={styles.numbersBig}>{static_data.uninspected}</span>
                  <p>
                    <span className={styles.numbersTag}>uninspected</span>
                  </p>
                </div>
                <div className={styles.numberWrapper}>
                  <span className={styles.numbersBig}>{static_data.total_2022}</span>
                  <p>
                    <span className={styles.numbersTag}>INSPECTIONS in 2022</span>
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
                    <VizTitle color="#fff">Monthly Service Requests by Source in 2022</VizTitle>
                    <StackedBarChart stacked={true} data={sr_by_source} />
                  </div>
                </div></section>
                
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
