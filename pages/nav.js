import Head from "next/head"
import Link from "next/link"

// Importing components (LEGO blocks of small pieces of React code to build modular)
import Footer from "../components/footer/footer.js" 
import Header from '../components/header/header.js'

// Importing styles (CSS)
import styles from "./styles/index.module.scss"

export default function Home() {
  return (
    <div className={styles.container}>
      <Header pageTitle="Index" />

      <main className={styles.main}>
        <h1 className={styles.title}>
          <a href="#">311</a> Data dashboard
        </h1>

        <p className={styles.description}>
          Hey winners. Get started by editing the indvidual pages at{" "}
          <code className={styles.code}>pages/*.js</code>. All the styling is
          done in <code className={styles.code}>pages/styles/*.scss</code> OR on
          a component (LEGO block) level at{" "}
          <code className={styles.code}>components/*/*.scss</code> Feel free to
          edit, remove or to play around. Nothing important can break at this
          point. We are using{" "}
          <a href="https://www.figma.com/file/oWTOYb5JiAk6a1oPpl6Nc7/Parks-Department-Borough-Manager-Dashboard">
            this Figma file
          </a>{" "}
          as our common truth in terms of design and structure. The individual
          pages are linked below.
        </p>

        <p className={styles.description}></p>
        <div className={styles.grid}>
          <Link href="/intro">
            <div className={styles.card}>
              <h2>Introduction &rarr;</h2>
              <p>
                Pretty intro page for context and user expectations.{" "}
              </p>
            </div>
          </Link>
          <Link href="/home">
            <div className={styles.card}>
              <h2>Home &rarr;</h2>
              <p>
                All the fancy dataviz and D3js implementation
              </p>
            </div>
          </Link>
          <Link href="/get-involved">
            <div className={styles.card}>
              <h2>Get Involved &rarr;</h2>
              <p>
                We present our call to action and FAQ
              </p>
            </div>
          </Link>
          <Link href="/metrics">
            <div className={styles.card}>
              <h2>Metrics &rarr;</h2>
              <p>
                Interactive data dashboards
              </p>
            </div>
          </Link>
          <Link href="/deepdive">
            <div className={styles.card}>
              <h2>Data Deepdive &rarr;</h2>
              <p>
                More in depth/playground for datavizs
              </p>
            </div>
          </Link>
        </div>
      </main>
      {/* Static reusing of component: use just the whole piece of code. Find more in `../components/footer/footer.js`*/}
      <Footer />
    </div>
  )
}
