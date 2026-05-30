"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function DeleteHourButton({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm("Delete this log entry?")) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("_action", "delete")
      const res = await fetch(`/api/hours/${id}`, { method: "POST", body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to delete" }))
        alert(data.error || "Failed to delete")
        return
      }
      router.refresh()
    } catch {
      alert("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleDelete} disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline disabled:opacity-50">
      {loading ? "..." : "Delete"}
    </button>
  )
}
