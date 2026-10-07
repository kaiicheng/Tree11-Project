import styles from "./editorial.module.scss";

function classes(...names) {
  return names.filter(Boolean).join(" ");
}

export function PageIntro({ children, eyebrow, inverted = false, title }) {
  return (
    <section className={classes(styles.pageIntro, inverted && styles.inverted)}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2>{title}</h2>
      {children && <div className={styles.copy}>{children}</div>}
    </section>
  );
}

export function SectionHeading({ children, eyebrow, id, inverted = false, title }) {
  return (
    <header className={classes(styles.sectionHeading, inverted && styles.inverted)}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      {children && <div className={styles.copy}>{children}</div>}
    </header>
  );
}

export function DataStatus({ items, inverted = false, label = "Dataset status" }) {
  return (
    <section className={classes(styles.dataStatus, inverted && styles.inverted)} aria-label={label}>
      {items.map((item) => (
        <div className={styles.statusItem} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.detail && <small>{item.detail}</small>}
        </div>
      ))}
    </section>
  );
}
