"use client"

import { useState, useRef, useEffect } from "react"

const VIDEO_URL = "/videos/time-logging-tutorial.mp4"

export default function TimeLoggingVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [watched, setWatched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const lastValidTime = useRef(0)
  const seeking = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    function handleSeeking() {
      if (video!.currentTime > lastValidTime.current + 0.5) {
        seeking.current = true
      }
    }

    function handleSeeked() {
      if (seeking.current) {
        video!.currentTime = lastValidTime.current
        seeking.current = false
      }
    }

    function handleTimeUpdate() {
      if (video!.currentTime > lastValidTime.current) {
        lastValidTime.current = video!.currentTime
      }
    }

    function handleEnded() {
      lastValidTime.current = video!.duration
      setWatched(true)
    }

    video.addEventListener("seeking", handleSeeking)
    video.addEventListener("seeked", handleSeeked)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("ended", handleEnded)

    return () => {
      video.removeEventListener("seeking", handleSeeking)
      video.removeEventListener("seeked", handleSeeked)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("ended", handleEnded)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!watched || submitting) return
    setSubmitting(true)
    const formData = new FormData()
    formData.set("step", "6")
    await fetch("/api/tutor/advance", { method: "POST", body: formData })
    window.location.reload()
  }

  return (
    <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/10">
      <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Learn How to Log Your Time</p>
      <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
        Watch the full video below. You must watch the entire video before you can continue to the next step.
      </p>

      <div className="rounded-lg overflow-hidden bg-black mb-4">
        <video
          ref={videoRef}
          className="w-full aspect-video"
          controls
          controlsList="nodownload"
          disablePictureInPicture
          playsInline
        >
          <source src={VIDEO_URL} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      {!watched && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
          Please watch the entire video to continue. The video cannot be skipped.
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={!watched || submitting}
          className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            watched && !submitting
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-500 cursor-not-allowed"
          }`}
        >
          {submitting ? "Saving..." : watched ? "I have completed the video and know how to log my time" : "Watch the full video to continue"}
        </button>
      </form>
    </div>
  )
}