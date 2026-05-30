"use client"

import { useState } from "react"
import { impersonateUser } from "@/lib/impersonate-action"

export default function ImpersonateButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await impersonateUser(userId)
    } catch (e) {
      alert((e as Error).message || "Failed to impersonate")
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