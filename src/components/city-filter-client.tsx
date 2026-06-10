"use client"

import { useRouter } from "next/navigation"

export function CityFilterClient({ cities, selected, name, currentParams }: { cities: { id: string; name: string }[]; selected: string; name: string; currentParams: Record<string, string> }) {
  const router = useRouter()

  function handleChange(value: string) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(currentParams)) {
      if (k !== name) params.set(k, v)
    }
    if (value !== "all") params.set(name, value)
    const qs = params.toString()
    router.push(qs ? `/dashboard/projects?${qs}` : "/dashboard/projects")
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-zinc-500">City:</label>
      <select
        name={name}
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="all">All Cities</option>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  )
}