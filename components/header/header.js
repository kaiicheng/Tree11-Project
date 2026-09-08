import Head from "next/head"
import styles from "./header.module.scss"

export default function Header({ pageTitle }) {
  return (
    <>
      <Head>
        <title>{pageTitle === "Home" ? "NYC Tree11" : `${pageTitle} | NYC Tree11`}</title>
        <meta
          name="description"
          content="Data Collaboration between 311, NYC Parks Department and Cornell Tech"
        />
        <link rel="icon" href="/favicon.png" />
      </Head>
    </>
  )
}
