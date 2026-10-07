import Head from "next/head"

const DEFAULT_DESCRIPTION = "Explore how NYC forestry service requests move through inspections and work orders.";

export default function Header({ canonicalPath, description = DEFAULT_DESCRIPTION, pageTitle }) {
  const title = pageTitle === "Home" ? "NYC Tree11" : `${pageTitle} | NYC Tree11`;
  const canonicalUrl = canonicalPath ? `https://www.tree11.org${canonicalPath}` : null;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
        {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
        <link rel="icon" href="/favicon.png" />
      </Head>
    </>
  )
}
