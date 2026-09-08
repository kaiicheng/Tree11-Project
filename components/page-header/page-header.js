import Button from "../buttons/buttons";
import { useRouter } from "next/router";
import styles from "./page-header.module.scss";

const DESCRIPTION =
  "Collaboration between Cornell Tech and NYCDPR focused on visualization, communication, and contextualization of public data to bring New Yorkers insight into how forestry service requests are addressed by the New York City Department of Parks and Recreation.";

export default function PageHeader({ accent, dark = false, showDescription = false, title = "NYC Tree11" }) {
  const { pathname } = useRouter();

  return (
    <header className={[styles.header, dark ? styles.dark : ""].join(" ")}>
      <h1 className={styles.title}>
        <span>{title}</span>
        {accent && <strong>{accent}</strong>}
      </h1>
      <nav className={styles.navigation} aria-label="Primary navigation">
        <div className={styles.primaryLinks}>
          <Button href="/" current={pathname === "/"}>Home</Button>
          <Button href="/intro" current={pathname === "/intro"}>About</Button>
          <Button href="/metrics" current={pathname === "/metrics"}>Metrics</Button>
          <Button href="/deepdive" current={pathname === "/deepdive"}>Deepdive</Button>
        </div>
        <Button href="/get-involved" current={pathname === "/get-involved"}>Get Involved</Button>
      </nav>
      {showDescription && <p className={styles.description}>{DESCRIPTION}</p>}
    </header>
  );
}
