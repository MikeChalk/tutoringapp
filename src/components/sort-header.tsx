import Link from "next/link"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

export function SortHeader({
  label,
  field,
  currentSort,
  currentOrder,
  searchParams,
  className,
}: {
  label: string
  field: string
  currentSort: string
  currentOrder: string
  searchParams?: Record<string, string | undefined>
  className?: string
}) {
  const isActive = currentSort === field
  const nextOrder = isActive && currentOrder === "asc" ? "desc" : "asc"
  const Icon = isActive ? (currentOrder === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown

  const params = new URLSearchParams()
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v) params.set(k, v)
    }
  }
  params.set("sort", field)
  params.set("order", nextOrder)

  return (
    <Link
      href={`?${params.toString()}`}
      className={`group inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors ${className || ""}`}
    >
      {label}
      <Icon className={`h-3 w-3 ${isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity"}`} />
    </Link>
  )
}
