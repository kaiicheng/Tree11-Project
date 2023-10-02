
/* eslint-disable react/no-unescaped-entities */

import Header from "../components/header/header";
import Footer from "../components/footer/footer";
import Button from "../components/buttons/buttons";
import StackedBarChart from "../components/charts/StackedBarChart";
import LineChart from "../components/charts/LineChart";
import Link from "next/link";
import { datafallback, pending_wo_by_type, sr_by_source } from "../data/dataCharts.js";

import Map from "../components/map/map";

import styles from "./styles/deepdive.module.scss";

function VizTitle({ children, color }) {
  return (
    <div className={styles.vizTitle}>
      <h3 style={{ color: color }}>{children}</h3>
    </div>
  );
}

export default function Deepdive() {
  return (
    <div className={styles.container}>
      <Header pageTitle="Data Deepdive" />

      <link
        href="https://api.tiles.mapbox.com/mapbox-gl-js/v1.2.0/mapbox-gl.css"
        rel="stylesheet"
      />

      <main className={styles.main}>
        <section className={styles.rowInfo}>
          <div className={styles.columnTitle}>
            <h1 className={styles.title}>
              NYC Tree11{" "}
              <span className={styles.title_sub}>Deepdive</span>
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
            <div>
              <div>
                <div>
                    <h2 className={styles.header_sub}>Request Types</h2>
                    <p className={styles.paragraph_long}>
                      Common request types include reports of tree hazards (such
                      as hanging limb, split tree, or leaning tree), dead or poor
                      condition trees, broken or fallen limbs, illegal tree
                      damage, sidewalk or infrastructure issue, tree planting, and
                      tree work permit.
                    </p>
                    {/* <section> */}
                    <div className={styles.dataVizGraph}>
                      <div className={styles.lineGraph}>
                        <VizTitle >
                          GRAPH OF Pending Work orders by Type
                        </VizTitle>
                        <LineChart data={pending_wo_by_type}/>
                      </div>
                    </div>
                    {/* </section> */}
                    
                  </div>

                <div>
                <p></p>
                <h2 className={styles.header_sub}>The Service Request Lifecycle</h2>

                  <div className={styles.grid}>
                    <Link href="https://storymaps.arcgis.com/stories/5353de3dea91420faaa7faff0b32206b#ref-n-ZPpns4">
                      <div className={styles.card_process}>
                        <h1>1.</h1>
                        <h2 className={styles.header_card}>Service Requests</h2>
                        <div className={styles.paragraph_card}>
                          Public & NY Agencies
                        </div>
                      </div>
                    </Link>
                    <div className={styles.card_process_arrow}> &#8250; </div>
                    <Link href="https://storymaps.arcgis.com/stories/5353de3dea91420faaa7faff0b32206b#ref-n-KyfZeu">
                      <div className={styles.card_process}>
                        <h1>2.</h1>
                        <h2 className={styles.header_card}>Inspections</h2>
                        <div className={styles.paragraph_card}>
                          Performed by NYC Parks
                        </div>
                      </div>
                    </Link>
                    <div className={styles.card_process_arrow}> &#8250; </div>
                    <Link href="https://storymaps.arcgis.com/stories/5353de3dea91420faaa7faff0b32206b#ref-n-ntq7kY">
                      <div className={styles.card_process}>
                        <h1>3.</h1>
                        <h2 className={styles.header_card}>Work Orders</h2>
                        <div className={styles.paragraph_card}>
                          Created by NYC Parks
                        </div>
                      </div>
                    </Link>
                  </div>
                  <p></p>
                  <h2 className={styles.header_sub}>Broken Down</h2>

                  <div className={styles.card}>
                    <h1>1. Service Requests</h1>
                    {/* <p className={styles.paragraph}>
                      Submitted by Public & NY Agencies
                    </p> */}

                    <div className={styles.dataVizLine}>
                      <div className={styles.lineNumbers}>
                        <div className={styles.numberWrapper}>
                          <span className={styles.numbersBig}>61093</span>
                          <span className={styles.numbersTag_card}>
                            {" "}
                            service requests submitted in nyc this year
                          </span>
                        </div>
                      </div>
                    </div>
                    <p>
                    Forestry Service Requests can be submitted by the public through the 311 system (phone, app, website),
                     on the NYCDPR website, via their NYC Street Tree Map website, or through other internal reporting means.
                      Once a service request is
                      submitted, DPR will review it to determine whether they will immediately send 
                      a specialist to tend to the request, or whether they should send a forester to 
                      inspect the submitted request before taking action.
                      </p> 
                      <p>Foresters may determine that no action should be taken
                      if a tree is currently ineligible for work depending on when it was last serviced, there is insufficient information with the 
                      submitted request, or there is a conflict of jurisdiction. If the request is for a tree planting,
                      the request would be declined if the site is unplantable or there is an issue with temperature.
                    </p>
                  </div>
                  <div className={styles.card}>
                    <h1>2. Inspections</h1>
                    {/* <p className={styles.paragraph}>Performed by NYC Parks</p> */}
                    <div className={styles.dataVizLine}>
                      <div className={styles.lineNumbers}>
                        <div className={styles.numberWrapper}>
                          <span className={styles.numbersBig}>23453</span>
                          <span className={styles.numbersTag_card}>
                            {" "}
                            inspections completed in nyc this year
                          </span>
                        </div>
                      </div>
                    </div>
                    <p>
                      Inspections are performed by forestry specialists to
                      determine if the submitted request requires Parks &
                      recreation’s resources. The forester may submit a work
                      order if they determine from the inspection that the
                      request requires further attention. 
                    </p>
                    <p>Cases in which a request might not lead to a work order after inspection
                      include when the forester is unable to locate the tree in question
                     or the decribed condition is not found,
                      when it is determined that alternate utility work is required, or 
                      if the forester chooses to waitlist the site.</p>
                  </div>
                  <div className={styles.card}>
                    <h1>3. Work Orders</h1>
                    {/* <p className={styles.paragraph}>Created by NYC Parks</p> */}
                    
                    <div className={styles.dataVizLine}>
                      <div className={styles.lineNumbers}>
                        <div className={styles.numberWrapper}>
                          <span className={styles.numbersBig}>4718</span>
                          <span className={styles.numbersTag_card}>
                            {" "}
                            work orders completed in nyc this year
                          </span>
                        </div>
                      </div>
                    </div>
                    <p>
                      Work orders are executed by forestry specialists or referred 
                      to other NYC government agencies if they are outside the jurisdiction of NYCDPR.
                      They are assigned a priority level to determine how urgently they must be serviced.
                    </p>
                  </div>
                </div>
                <div>
                  <p>.</p>
                </div>

                {/* MOVED TO HOME PAGE */}
                {/* <div>
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
                  
                  <div className={styles.dataVizTop}>
                    <VizTitle color="#fff">Monthly Service Requests by Source in 2022</VizTitle>
                    <StackedBarChart stacked={true} data={sr_by_source} />
                  </div>
                </div> */}

              </div>
{/*               
              <div>
                <p>.</p>
              </div> */}
              <div>
                <h2 className={styles.header_sub}>Data & Research Metrics</h2>
                <p className={styles.paragraph}>
                  All data is from NYC Open Data.
                </p>
                <p className={styles.paragraph}>
                  Data and Research information can be found on our {" "}
                  <Button href={"/intro"}>About</Button> page.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
