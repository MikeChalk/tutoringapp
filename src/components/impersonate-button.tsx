"use client"

import { useState } from "react"

export default function ImpersonateButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (data.redirect) {
        window.location.href = data.redirect
      } else {
        alert(data.error || "Failed")
        setLoading(false)
      }
    } catch {
      alert("Network error")
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="text-xs text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50"
    >
      {loading ? "Switching..." : "Impersonate"}
    </button>
  )
}