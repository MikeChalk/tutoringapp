"use client"

import Link from "next/link"

export function SortableHeader({ label, field, currentSort, currentOrder, basePath }: {
  label: string; field: string; currentSort?: string; currentOrder?: string; basePath: string
}) {
  const isActive = currentSort === field
  const nextOrder = isActive && currentOrder === "asc" ? "desc" : "asc"
  const params = new URLSearchParams()
  params.set("sort", field)
  params.set("order", nextOrder)

  return (
    <Link href={`${basePath}?${params.toString()}`} className="inline-flex items-center gap-1 group">
      <span>{label}</span>
      <span className={`text-[10px] transition-colors ${isActive ? "text-blue-600 dark:text-blue-400" : "text-zinc-300 group-hover:text-zinc-500"}`}>
        {isActive ? (currentOrder === "asc" ? "▲" : "▼") : "▼"}
      </span>
    </Link>
  )
}
