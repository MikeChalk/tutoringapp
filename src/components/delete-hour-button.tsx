"use client"

import { useRouter } from "next/navigation"

export function DeleteHourButton({ id }: { id: string }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm("Delete this log entry?")) return
    await fetch(`/api/hours/${id}`, { method: "POST" })
    router.refresh()
  }

  return (
    <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline">
      Delete
    </button>
  )
}
