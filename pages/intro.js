
import Header from "../components/header/header"
import Footer from "../components/footer/footer"
import Button from "../components/buttons/buttons"
import Link from "next/link"

import styles from "./styles/intro.module.scss"

export default function Intro() {
  return (
    <div className={styles.container}>
      <Header pageTitle="About"/>

      <main className={styles.main}>
        <section className={styles.rowInfo}>
          <div className={styles.columnTitle}>
          <h1 className={styles.title}>NYC Tree11 <span className={styles.title_sub}>About</span></h1>
          </div>
          <div className={styles.columnInfo}>
            <div className={styles.navigation}>
              <nav>
                <Button href={"/"}>Home</Button>
                <Button href={"/intro"}>About</Button>
                <Button href={"/metrics"}>Metrics</Button>
                <Button href={"/deepdive"}>Deepdive</Button>
              </nav>
              <nav>
              <Button href={"/get-involved"}>Get Involved</Button>
              </nav>
            </div>
          </div>
        </section> 
        <section className={styles.dataGrid}>
          <div className={styles.rightCol}>
            <p className={styles.paragraph_sub}>
              This dashboard aims to provide New Yorkers insight into current forestry work across the city and within the boroughs, in the hopes of further promoting civic engagement with NYC’s 311 system.
              A large portion of municipal government services are allocated in reaction to resident crowdsourcing, in which people report problems that they encounter; the New York City 311 system received 2.7 million complaints in 2021. These reports are used to make both immediate decisions—such as which dangerous, downed trees to inspect and fix—and longer-term planning decisions, such as which streets to resurface. While such reporting systems have gained popularity in the last few decades, there is concern that (a) the public doesn’t homogeneously use the system, i.e., some neighborhoods under-report and others exaggerate their incidents; and (b) that municipal agencies are not equitably responsive to complaints from different neighborhoods.
            </p>
            <p className={styles.paragraph_sub}>
            This research develops computational methods to accomplish three goals:
            </p>
            <div className={styles.grid}>
              <div className={styles.card_list}>
                <h1>1.</h1>
                <h2 className={styles.header_card}>Understand</h2>
                    <span className={styles.paragraph_card}>Understand heterogeneous biases and behavior in crowdsourced data</span>
              </div>
              <div className={styles.card_list}>
                <h1>2.</h1>
                <h2 className={styles.header_card}>Audit</h2>
                    <span className={styles.paragraph_card}>Audit government responses to resident complaints</span>
              </div>
              <div className={styles.card_list}>
                <h1>3.</h1>
                <h2 className={styles.header_card}>Design</h2>
                    <span className={styles.paragraph_card}>Design more efficient, equitable, implementable decision-making systems</span>
              </div>
            </div>
            <p className={styles.paragraph_sub}>
              We are working with the New York City Department of Parks and Recreation (NYCDPR) to validate and deploy insights from our methods.
            
                This research uses publicly available data from NYCDPR, which you can find on the NYC Open Data Portal:
              </p>
              <div className={styles.grid}>
                <Link href="https://data.cityofnewyork.us/Environment/Forestry-Service-Requests/mu46-p9is">
                  <div className={styles.card_process}>
                    <h2>Forestry Service Requests Dataset &rarr;</h2>
                    <p>
                      View the publicly available Forestry Service Requests dataset on NYC Open Data.
                    </p>
                  </div>
                </Link>
                <Link href="https://data.cityofnewyork.us/Environment/Forestry-Inspections/4pt5-3vv4">
                  <div className={styles.card_process}>
                    <h2>Forestry Inspections Dataset&rarr;</h2>
                    <p>
                      View the publicly available Forestry Inspections dataset on NYC Open Data.
                    </p>
                  </div>
                </Link>
                <Link href="https://data.cityofnewyork.us/Environment/Forestry-Work-Orders/bdjm-n7q4">
                  <div className={styles.card_process}>
                    <h2>Forestry Work Orders Dataset &rarr;</h2>
                    <p>
                      View the publicly available Forestry Work Orders dataset on NYC Open Data.
                    </p>
                  </div>
                </Link>
              </div>
          </div>
          <div>
            {/* <div className={styles.header_main_Top}> */}
              <h2 className={styles.header_sub}>Contact Us</h2>
                <p className={styles.paragraph_credits}>Credits Prof. Nikhil Garg (nkgar6@gmail.com)</p>
                <p className={styles.paragraph_credits}>Emma Condie (MSC)</p>
                <p className={styles.paragraph_credits}>Marie Leaf (MSC)</p>
                <p className={styles.paragraph_credits}>Elizabeth Pysher (MSC)</p>
                <p className={styles.paragraph_credits}>Daan van der Zwaag (MSC)</p>
                <p className={styles.paragraph_credits}>Shou-Kai Cheng (MSC)</p>
                <p className={styles.paragraph_credits}>Mingxi Liu (MSC)</p>
                <p className={styles.paragraph_credits}>Christy(Mengqi) Wu (MSC)</p>
            {/* </div> */}
          </div> 
        </section>
      </main>
      {/* Static reusing of component: use just the whole piece of code. Find more in `../components/footer/footer.js`*/}
      <Footer />
    </div>
  )
}
