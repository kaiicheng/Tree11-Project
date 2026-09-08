
import Link from "next/link"
import styles from "./buttons.module.scss"

export default function Button({ href, children, current = false }) {
  return (
    <Link href={href} aria-current={current ? "page" : undefined}>
      <span className={[styles.buttonSmall, current ? styles.active : ""].join(" ")}>{children}</span>
    </Link>
  )
}

