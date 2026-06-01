"use client"

import { useRef, useEffect, useState } from "react"
import { animate, useReducedMotion } from "motion/react"
import { DURATION_COUNT_UP, EASE_COUNT_UP } from "@/lib/motion-config"

interface CountUpValueProps {
  target: number
  decimals?: number
  prefix?: string
}

export default function CountUpValue({ target, decimals = 2, prefix = "$" }: CountUpValueProps) {
  const prefersReducedMotion = useReducedMotion()
  const [display, setDisplay] = useState(() => `${prefix}${target.toFixed(decimals)}`)
  const prevRef = useRef<number>(target)
  const animRef = useRef<ReturnType<typeof animate> | null>(null)

  useEffect(() => {
    const from = prevRef.current
    prevRef.current = target

    if (from === target || prefersReducedMotion) {
      setDisplay(`${prefix}${target.toFixed(decimals)}`)
      return
    }

    animRef.current?.stop()
    animRef.current = animate(from, target, {
      duration: DURATION_COUNT_UP,
      ease: EASE_COUNT_UP,
      onUpdate(value) {
        setDisplay(`${prefix}${value.toFixed(decimals)}`)
      },
    })

    return () => { animRef.current?.stop() }
  }, [target, decimals, prefix, prefersReducedMotion])
  return <span>{display}</span>
}