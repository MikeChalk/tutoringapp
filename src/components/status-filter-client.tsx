"use client"

import { useRouter } from "next/navigation"

export function StatusFilterClient({ defaultValue, currentParams }: { defaultValue: string; currentParams: Record<string, string> }) {
  const router = useRouter()

  function handleChange(value: string) {
    const params = new URLSearchParams()
    if (value !== "ALL") params.set("status", value)
    for (const [k, v] of Object.entries(currentParams)) {
      if (k !== "status") params.set(k, v)
    }
    const qs = params.toString()
    router.push(qs ? `/dashboard/projects?${qs}` : "/dashboard/projects")
  }

  return (
    <select
      value={defaultValue}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="ALL">All</option>
      <option value="IN_PROGRESS">In Progress</option>
      <option value="ON_HOLD">On Hold</option>
      <option value="FINISHED">Finished</option>
      <option value="CANCELLED">Cancelled</option>
    </select>
  )
}