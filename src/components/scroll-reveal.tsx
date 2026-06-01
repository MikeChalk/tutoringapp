"use client"

import { motion, useReducedMotion } from "motion/react"
import { DURATION_SCROLL_REVEAL, EASE_DEFAULT, SCROLL_THRESHOLD } from "@/lib/motion-config"

interface ScrollRevealProps {
  children: React.ReactNode
  delay?: number
}

export default function ScrollReveal({ children, delay = 0 }: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <>{children}</>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: SCROLL_THRESHOLD }}
      transition={{ duration: DURATION_SCROLL_REVEAL, delay, ease: EASE_DEFAULT }}
    >
      {children}
    </motion.div>
  )
}