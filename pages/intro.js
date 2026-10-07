import Header from "../components/header/header";
import Footer from "../components/footer/footer";
import PageHeader from "../components/page-header/page-header";
import { PageIntro, SectionHeading } from "../components/editorial/editorial";
import styles from "./styles/intro.module.scss";

const goals = [
  ["01", "Understand", "Identify participation patterns and bias in crowdsourced forestry reports."],
  ["02", "Audit", "Measure how service requests move through inspection and work-order decisions."],
  ["03", "Design", "Turn evidence into more efficient, equitable, and implementable public systems."],
];

const datasets = [
  ["Forestry Service Requests", "https://data.cityofnewyork.us/Environment/Forestry-Service-Requests/mu46-p9is"],
  ["Forestry Inspections", "https://data.cityofnewyork.us/Environment/Forestry-Inspections/4pt5-3vv4"],
  ["Forestry Work Orders", "https://data.cityofnewyork.us/Environment/Forestry-Work-Orders/bdjm-n7q4"],
];

const interpretationNotes = [
  ["Requests are not trees", "Several reports can refer to the same location or condition, and one report can lead to more than one agency record."],
  ["Links are evidence-based", "Tree11 only connects records when published identifiers support the relationship. An unmatched record is not proof that no action occurred."],
  ["Open cases need time", "Cases still in progress are right-censored and excluded from completed-duration calculations until an observable outcome exists."],
];

const team = [
  "Prof. Nikhil Garg", "Emma Condie", "Marie Leaf", "Elizabeth Pysher",
  "Daan van der Zwaag", "Shou-Kai Cheng", "Mingxi Liu", "Christy (Mengqi) Wu",
];

export default function Intro() {
  return (
    <div className={styles.container}>
      <Header canonicalPath="/intro" description="Learn how Tree11 links NYC forestry requests, inspections, and work orders—and how to interpret the public data responsibly." pageTitle="About" />
      <main className={styles.main}>
        <PageHeader accent="About" dark />

        <PageIntro eyebrow="Why Tree11 exists" inverted title="Public reports shape how New York City responds to its urban forest.">
          <p>
            Tree11 makes the forestry service-request lifecycle easier to see: what residents report,
            what NYC Parks inspects, and which cases become work orders. The project also examines
            whether participation and agency response differ across neighborhoods.
          </p>
        </PageIntro>

        <section className={styles.goals} aria-labelledby="research-goals">
          <SectionHeading eyebrow="Research framework" id="research-goals" inverted title="Three connected goals" />
          <div className={styles.goalGrid}>
            {goals.map(([number, title, copy]) => (
              <article className={styles.goalCard} key={title}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.resources} aria-labelledby="open-data">
          <SectionHeading eyebrow="Primary sources" id="open-data" inverted title="NYC Open Data">
            <p>Tree11 uses publicly available NYC Parks datasets. Open the source records to inspect methodology and fields directly.</p>
          </SectionHeading>
          <div className={styles.resourceGrid}>
            {datasets.map(([label, href]) => (
              <a href={href} target="_blank" rel="noopener noreferrer" key={label}>
                <span>Dataset</span>
                <strong>{label}</strong>
                <b aria-hidden="true">↗</b>
              </a>
            ))}
          </div>
        </section>

        <section className={styles.resources} aria-labelledby="reading-data">
          <SectionHeading eyebrow="Methodology" id="reading-data" inverted title="How to read Tree11">
            <p>The dashboard is designed for operational context, not individual performance evaluation. These rules keep the comparisons defensible.</p>
          </SectionHeading>
          <div className={styles.noteGrid}>
            {interpretationNotes.map(([title, copy]) => (
              <article className={styles.noteCard} key={title}>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.team} aria-labelledby="project-team">
          <SectionHeading eyebrow="Collaboration" id="project-team" inverted title="Project team" />
          <ul>{team.map((name) => <li key={name}>{name}</li>)}</ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
