import Header from "../components/header/header"
import Footer from "../components/footer/footer"
import Button from "../components/buttons/buttons"
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
                  <Button href={"/intro"}>Metrics</Button>
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

              <script src="https://d3js.org/d3.v4.js"></script>
              <h1>Stats for the Year</h1>

              <button onclick="update('SRs')">SRs</button>
              <button onclick="update('WOs')">WOs</button>
              <button onclick="update('INSs')">INSs</button>

              {/* <!-- Create a div where the graph will take place --> */}
              <div id="my_dataviz"></div>
              <script src = '../plotD3/boxplot.js'></script>


            </div>
          </section>
          
        </main>


      


        <Footer />
      </div>
    );
  }