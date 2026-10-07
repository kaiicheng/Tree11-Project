import Header from "../components/header/header";
import Footer from "../components/footer/footer";
import PageHeader from "../components/page-header/page-header";
import { PageIntro, SectionHeading } from "../components/editorial/editorial";
import styles from "./styles/get-involved.module.scss";

const sections = [
  {
    label: "Start here",
    title: "Report and track a tree issue",
    description: "Use official NYC services to submit a new request or follow an existing case.",
    featured: true,
    links: [
      ["Submit a tree service request", "NYC Parks can inspect hazardous, damaged, diseased, or fallen street and park trees.", "https://www.nycgovparks.org/services/forestry/request/submit"],
      ["Look up an existing request", "Check a 311 service request using its confirmation number.", "https://portal.311.nyc.gov/check-status/"],
      ["Understand tree risk", "Learn how NYC Parks evaluates tree conditions and prioritizes work.", "https://www.nycgovparks.org/services/forestry/risk-management"],
    ],
  },
  {
    label: "Stewardship",
    title: "Plant and care for the urban forest",
    links: [
      ["Request a street tree", "Ask NYC Parks to evaluate a possible street-tree planting location.", "https://portal.311.nyc.gov/article/?kanumber=KA-01895"],
      ["Apply for a tree work permit", "Get authorization before construction, planting, or private work near a City tree.", "https://www.nycgovparks.org/services/forestry/tree-work-permit"],
      ["Find your community board", "Connect with the local board that represents your neighborhood.", "https://www.nyc.gov/site/cau/community-boards/community-boards.page"],
    ],
  },
  {
    label: "Safety",
    title: "Know what to do around damaged trees",
    links: [
      ["Report damaged or fallen trees", "Recognize urgent conditions and send the right report to NYC Parks or 311.", "https://www.nycgovparks.org/services/forestry/damaged-fallen-trees"],
      ["Trees and severe weather", "Review storm precautions and NYC Parks response information.", "https://www.nycgovparks.org/services/forestry/storm-response"],
      ["Trees and sidewalks", "Learn about repairs for severe sidewalk damage caused by tree roots.", "https://www.nycgovparks.org/services/forestry/trees-sidewalks-program"],
    ],
  },
  {
    label: "Learn more",
    title: "Explore NYC Parks resources",
    links: [
      ["NYC Parks", "Visit the official New York City Department of Parks & Recreation website.", "https://www.nycgovparks.org/"],
      ["Our Urban Forest story map", "See how NYC Parks describes the citywide tree-care system.", "https://storymaps.arcgis.com/stories/5353de3dea91420faaa7faff0b32206b"],
      ["NYC Street Tree Map", "Explore individual street trees, report problems, and record stewardship activity.", "https://tree-map.nycgovparks.org/"],
      ["Tree Work Hub", "Review recently completed and upcoming planned tree work.", "https://www.nycgovparks.org/services/forestry/tree-work"],
      ["Tree pruning", "Learn how NYC Parks schedules neighborhood-based pruning.", "https://www.nycgovparks.org/services/forestry/tree-pruning"],
      ["Tree and stump removal", "Understand inspection and removal of dead trees in public spaces.", "https://www.nycgovparks.org/services/forestry/dead-tree-removal"],
    ],
  },
];

export default function GetInvolved() {
  return (
    <div className={styles.container}>
      <Header canonicalPath="/get-involved" description="Find official NYC resources to report, track, and understand street-tree issues and urban-forest stewardship." pageTitle="Get Involved" />
      <main className={styles.main}>
        <PageHeader title="Get Involved" showDescription />
        <PageIntro eyebrow="Official services" title="Choose the action that matches what you see.">
          <p>Tree11 helps explain the system; requests themselves should always be submitted through official NYC channels.</p>
        </PageIntro>

        <aside className={styles.emergency} aria-label="Emergency guidance">
          <strong>Immediate danger?</strong>
          <p>For a fallen tree blocking traffic, downed wires, or another life-safety emergency, call 911. For non-emergencies, use 311 or the official NYC Parks forms below.</p>
        </aside>

        {sections.map((section) => (
          <section className={styles.resourceSection} key={section.title}>
            <SectionHeading eyebrow={section.label} title={section.title}>
              {section.description && <p>{section.description}</p>}
            </SectionHeading>
            <div className={[styles.grid, section.featured ? styles.featured : ""].join(" ")}>
              {section.links.map(([title, copy, href]) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className={styles.card} key={title}>
                  <strong>{title}</strong>
                  <p>{copy}</p>
                  <span aria-hidden="true">Open official resource ↗</span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
