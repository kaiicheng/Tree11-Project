
import Link from "next/link"
import { Children } from 'react'
import styles from "./buttons.module.scss"

export default function Button({href, children}) {
  return (
    <Link href={href}><span className={styles.buttonSmall}>{children}</span></Link>
  )
}

