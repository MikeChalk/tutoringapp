"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import { stopImpersonating } from "@/lib/stop-impersonate-action"

export default function ImpersonationBanner() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)

  if (!session?.user?.impersonatedBy) return null

  async function stop() {
    setLoading(true)
    try {
      await stopImpersonating()
    } catch {
      window.location.reload()
    }
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-sm flex items-center justify-between">
      <span>
        Impersonating <strong>{session.user.name}</strong> ({session.user.role})
      </span>
      <button
        type="button"
        onClick={stop}
        disabled={loading}
        className="bg-white text-amber-700 px-3 py-1 rounded text-xs font-medium hover:bg-amber-50 transition-colors disabled:opacity-50"
      >
        {loading ? "Stopping..." : "Stop Impersonating"}
      </button>
    </div>
  )
}