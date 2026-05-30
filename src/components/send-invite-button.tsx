"use client"

import { useState } from "react"

export default function SendInviteButton({ userId, label = "Send Invite" }: { userId: string; label?: string }) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function sendInvite() {
    setLoading(true)
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (data.success) setSent(true)
      else alert(data.error || "Failed to send invite")
    } catch {
      alert("Failed to send invite")
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return <span className="text-xs text-green-600 dark:text-green-400">Invite sent!</span>
  }

  return (
    <button
      type="button"
      onClick={sendInvite}
      disabled={loading}
      className="text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
    >
      {loading ? "Sending..." : label}
    </button>
  )
}