"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import {
  WELCOME_HOLD_FULL, WELCOME_HOLD_BRIEF,
  WELCOME_TEXT_DURATION_FULL, WELCOME_TEXT_DURATION_BRIEF,
  WELCOME_SUBLINE_DELAY_FULL, WELCOME_SUBLINE_DELAY_BRIEF,
  WELCOME_SUBLINE_FADE_DURATION,
  WELCOME_FADE_DURATION, WELCOME_FADE_EASE,
} from "@/lib/motion-config"

type WelcomeMode = "full" | "brief"

interface TutorWelcomeProps {
  greeting: string
  subline?: string
  welcomeMode: WelcomeMode
  todayStr: string
}

export default function TutorWelcome({ greeting, subline, welcomeMode, todayStr }: TutorWelcomeProps) {
  const prefersReducedMotion = useReducedMotion()
  const [showOverlay, setShowOverlay] = useState(false)
  const [showCover, setShowCover] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [shouldSkip, setShouldSkip] = useState<boolean | null>(null)

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem("welcomeShown")
    const shownDate = sessionStorage.getItem("welcomeDate")
    if (alreadyShown === "true" && shownDate === todayStr) {
      setShouldSkip(true)
      setShowCover(false)
    } else {
      setShouldSkip(false)
      setShowOverlay(true)
      setShowCover(false)
    }
  }, [todayStr])

  const dismiss = useCallback(() => {
    if (dismissed) return
    setDismissed(true)
    setShowOverlay(false)
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Montreal",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
    sessionStorage.setItem("welcomeShown", "true")
    sessionStorage.setItem("welcomeDate", todayStr)
    document.cookie = `lastWelcomeDate=${today}; path=/; max-age=86400; SameSite=Lax`
    document.cookie = `lastGreeting=${encodeURIComponent(greeting)}; path=/; max-age=86400; SameSite=Lax`
    setShowCover(false)
  }, [dismissed, todayStr, greeting])

  useEffect(() => {
    if (!showOverlay || prefersReducedMotion) return
    const holdMs = welcomeMode === "full" ? WELCOME_HOLD_FULL : WELCOME_HOLD_BRIEF
    const timer = setTimeout(() => { setShowOverlay(false) }, holdMs)
    return () => clearTimeout(timer)
  }, [showOverlay, welcomeMode, prefersReducedMotion])

  const handleExitComplete = useCallback(() => {
    sessionStorage.setItem("welcomeShown", "true")
    sessionStorage.setItem("welcomeDate", todayStr)
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Montreal",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
    document.cookie = `lastWelcomeDate=${today}; path=/; max-age=86400; SameSite=Lax`
    document.cookie = `lastGreeting=${encodeURIComponent(greeting)}; path=/; max-age=86400; SameSite=Lax`
  }, [todayStr])

  return (
    <>
      {showCover && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "#1E3A5F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      )}

      {shouldSkip !== null && !shouldSkip && prefersReducedMotion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E3A5F] cursor-pointer"
          onClick={dismiss}
        >
          <div className="text-center px-6 max-w-3xl">
            <p className="text-6xl md:text-7xl font-bold text-white font-[family-name:var(--font-inter)]">
              {greeting}
            </p>
            {subline && (
              <p className="text-2xl md:text-3xl text-[#A8C4DE] mt-6 font-[family-name:var(--font-inter)]">
                {subline}
              </p>
            )}
          </div>
        </div>
      )}

      {shouldSkip !== null && !shouldSkip && !prefersReducedMotion && (() => {
        const textDuration = welcomeMode === "full" ? WELCOME_TEXT_DURATION_FULL : WELCOME_TEXT_DURATION_BRIEF
        const sublineDelay = welcomeMode === "full" ? WELCOME_SUBLINE_DELAY_FULL : WELCOME_SUBLINE_DELAY_BRIEF

        return (
          <AnimatePresence onExitComplete={handleExitComplete}>
            {showOverlay && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E3A5F] cursor-pointer"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: WELCOME_FADE_DURATION, ease: WELCOME_FADE_EASE }}
                onClick={dismiss}
              >
                <div className="text-center px-6 max-w-3xl">
                  <motion.p
                    className="text-6xl md:text-7xl font-bold text-white font-[family-name:var(--font-inter)]"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: textDuration, ease: "easeOut" }}
                  >
                    {greeting}
                  </motion.p>
                  {subline && (
                    <motion.p
                      className="text-2xl md:text-3xl text-[#A8C4DE] mt-6 font-[family-name:var(--font-inter)]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: WELCOME_SUBLINE_FADE_DURATION, delay: sublineDelay }}
                    >
                      {subline}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )
      })()}
    </>
  )
}