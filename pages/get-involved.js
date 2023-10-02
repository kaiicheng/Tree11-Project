
import Header from "../components/header/header"
import Footer from "../components/footer/footer"
import Button from "../components/buttons/buttons"
import Head from "next/head"
import Link from "next/link"
import StackedBarChart from "../components/charts/StackedBarChart";



import styles from "./styles/get-involved.module.scss"

import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import faker from "faker";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export const options = {
  responsive: true,
  interaction: {
    mode: "index",
    intersect: false,
  },
  stacked: false,
  plugins: {
    title: {
      display: false,
      text: "Chart.js Line Chart - Multi Axis",
    },

  },
  scales: {
    y: {
      type: "linear",
      display: true,
      position: "left",
    },
    y1: {
      type: "linear",
      display: true,
      position: "right",
      grid: {
        drawOnChartArea: false,
      },
    },
  },
};

export const optionsPie = {
  responsive: true,
  plugins: {
    legend: {
      position: 'right',
    },

  },
};
const labels = ["January", "February", "March", "April", "May", "June", "July"];

export const data = {
  labels,
  datasets: [
    {
      label: "Requests",
      data: labels.map(() => faker.datatype.number({ min: -1000, max: 1000 })),
      borderColor: "000000",
      backgroundColor: "#000000",
      yAxisID: "y",
    },
    {
      label: "Inspections",
      data: labels.map(() => faker.datatype.number({ min: -1000, max: 1000 })),
      borderColor: "#C4C3B8",
      backgroundColor: "#C4C3B8",
      yAxisID: "y1",
    },
  ],
};

export default function CTA() {
  return (
    <div className={styles.container}>
      <Header pageTitle="Get Involved"/>

      <main className={styles.main}>
        <section className={styles.rowInfo}>
          <div className={styles.columnTitle}>
            <h1 className={styles.title}>Get Involved</h1>
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
        <div>
          <h2 className={styles.header_sub}>&#127807; Action</h2>

          <div className={styles.rowData}>
            <div className={styles.grid}>
              <Link href="https://www.nycgovparks.org/services/forestry/request/submit" target="_blank">
                <div className={styles.card}>
                  <h2 className={styles.header_card}>Submit a Tree Service Request &rarr;</h2>
                  <p>
                  NYCDPR has dedicated staff in each borough to protect and support the safety and health of our trees. If you know of any condition that needs our attention, please report it.{" "}
                  </p>
                </div>
              </Link>

              <Link href="https://portal.311.nyc.gov/check-status/">
                <div className={styles.card}>
                  <h2>Look Up an Existing Request &rarr;</h2>
                  <p>
                  You can check the status of your Service Request via the associated Service Request number.
                  </p>
                </div>
              </Link>
              <Link href="https://www.nycgovparks.org/services/forestry/risk-management">
                <div className={styles.card}>
                  <h2>Learn about Managing Tree Risk &rarr;</h2>
                  <p>
                  As the stewards of New York City’s urban forest, NYC Parks cares for our city’s street and park trees and responds to more than 80,000 forestry-related service requests from concerned New Yorkers each year. 
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>

<div>
          <h2 className={styles.header_sub}></h2>
          <div className={styles.rowInfo}>
            <div className={styles.grid}>
              <Link href="https://portal.311.nyc.gov/article/?kanumber=KA-01895" target="_blank">
                <div className={styles.card}>
                  <h2>Request a Tree &rarr;</h2>
                  <p>
                  You can submit a request to the Department of Parks and Recreation (DPR) for street tree planting. You can also make a complaint about the condition of a newly planted street tree.
                  </p>
                </div>
              </Link>
              <Link href="https://www.nycgovparks.org/services/forestry/tree-work-permit">
                <div className={styles.card}>
                  <h2>Plant a Tree &rarr;</h2>
                  <p>
                  It is NYC Parks’ responsibility to protect and care for our trees. Whether you are proposing construction on or near a City street tree, planting a tree on your own, or submitting a building plan for review, you must first apply for a Tree Work Permit.
                  </p>
                </div>
              </Link>

              <Link href="https://www.nyc.gov/site/cau/community-boards/community-boards.page">
                <div className={styles.card}>
                  <h2>Find Your Community Board &rarr;</h2>
                  <p>
                  Being a New Yorker means playing an active role in shaping your local communities, and one way to do this is to get involved with your local community board.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div>
          <h2 className={styles.header_sub}>&#9928;&#65039; Safety</h2>
          <div className={styles.rowInfo}>
            <div className={styles.grid}>
              <Link href="https://www.nycgovparks.org/services/forestry/damaged-fallen-trees">
                <div className={styles.card}>
                  <h2>How to Report Damaged or Fallen Trees &rarr;</h2>
                <p>
                  Report damanged and fallen trees immediately if a tree branch or limb is cracked, will fall, or has fallen down; a tree trunk has split; a tree is leaning, uprooted, or has fallen down; a tree is alive, but is in poor or declining condition.
                </p>
                </div>
              </Link>

              <Link href="https://www.nycgovparks.org/services/forestry/storm-response">
                <div className={styles.card}>
                  <h2>Trees and Severe Weather &rarr;</h2>
                  <p>
                  Keep yourself safe! During storms, trees and limbs may become weakened and can fall. Exercise caution under and around trees during stormy weather. To report a downed or damaged tree, submit a service request. Call 911 if there is a life-threatening emergency, or to report damaged electrical utilities and power outages.
                  </p>
                </div>
              </Link>

              <Link href="https://www.nycgovparks.org/services/forestry/trees-sidewalks-program">
                <div className={styles.card}>
                  <h2>Repair a Sidewalk &rarr;</h2>
                  <p>
                  Parks’ sidewalk repair program can help repair severe sidewalk damage caused by root growth. You may also repair the sidewalk on your own by engaging an independent contractor, and completing a Tree Work Permit application on the NYC Parks website.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div>
          <h2 className={styles.header_sub}>&#128506; NYC Parks Resources</h2>
          <div className={styles.rowInfo}>
            <div className={styles.grid}>
              <Link href="https://www.nycgovparks.org/">
                <div className={styles.card}>
                  <h2>NYC Parks &rarr;</h2>
                  <p>
                  Visit the official website of the New York City Department of Parks & Recreation.
                  </p>
                </div>
              </Link>
              <Link href="https://storymaps.arcgis.com/stories/5353de3dea91420faaa7faff0b32206b">
                <div className={styles.card}>
                  <h2>Our Urban Forest &rarr;</h2>
                  <p>
                    Scroll through this storymap created by the Parks Department to learn about New York City&apos;s trees and how we care for them.
                  </p>
                </div>
              </Link>
              <Link href="https://tree-map.nycgovparks.org/">
                <div className={styles.card}>
                  <h2>NYC Street Tree Map &rarr;</h2>
                  <p>
                  Learn about the trees that make up our city’s urban forest, report a problem with a tree, mark trees as favorites and share them with your friends, and record and share all of your caretaking and tree stewardship activities.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div> 

        <div>
          <h2 className={styles.header_sub}></h2>
          <div className={styles.rowInfo}>
            <div className={styles.grid}>
              <Link href="https://www.nycgovparks.org/services/forestry/tree-work">
                <div className={styles.card}>
                  <h2>Tree Work Hub &rarr;</h2>
                  <p>
                  To help keep you informed, NYC Parks shares maps and tabular data of recently completed and upcoming planned tree-related work for many of our most popular forestry services.
                  </p>
                </div>
              </Link>

              <Link href="https://www.nycgovparks.org/services/forestry/tree-pruning">
                <div className={styles.card}>
                  <h2>Tree Pruning &rarr;</h2>
                  <p>
                  Parks prunes established street trees on a neighborhood–by–neighborhood basis. This process allows us to prune a portion of the street trees in each community board every year.
                  </p>
                </div>
              </Link>

              <Link href="https://www.nycgovparks.org/services/forestry/dead-tree-removal">
                <div className={styles.card}>
                  <h2>Tree and Stump Removal &rarr;</h2>
                  <p>
                  Dead trees reported on streets, parks, playgrounds or other public spaces will be inspected and, if appropriate, removed. As part of NYC Parks new Tree Risk Management program—Work is prioritized to address the highest risk conditions first. To report a dead tree, call 311 or use our tree service request system.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Static reusing of component: use just the whole piece of code. Find more in `../components/footer/footer.js`*/}
      <Footer />
    </div>
  )
}
