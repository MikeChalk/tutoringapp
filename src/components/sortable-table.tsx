"use client"

import { useState, useMemo } from "react"

interface SortableTableProps {
  children: React.ReactNode
  searchKeys?: string[]
  searchPlaceholder?: string
  filterKey?: string
  filterOptions?: { value: string; label: string }[]
  data?: Record<string, unknown>[]
  initialFilter?: string
}

export default function SortableTable({ children, searchKeys, searchPlaceholder = "Search...", filterKey, filterOptions, data, initialFilter = "" }: SortableTableProps) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState(initialFilter)
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const hasSearch = searchKeys && searchKeys.length > 0 && data
  const hasFilter = filterKey && filterOptions && data

  const filteredData = useMemo(() => {
    if (!data) return data
    let result = data
    if (hasSearch && search) {
      const q = search.toLowerCase()
      result = result.filter((row) =>
        searchKeys!.some((k) => {
          const val = row[k]
          return val != null && String(val).toLowerCase().includes(q)
        })
      )
    }
    if (hasFilter && filter) {
      result = result.filter((row) => String(row[filterKey!]) === filter)
    }
    if (sortCol !== null) {
      result = [...result].sort((a, b) => {
        const key = sortCol !== null && hasSearch ? (searchKeys ?? [])[sortCol] : null
        if (!key) return 0
        const aVal = a[key]
        const bVal = b[key]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1
        const aNum = Number(aVal)
        const bNum = Number(bVal)
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDir === "asc" ? aNum - bNum : bNum - aNum
        }
        return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal))
      })
    }
    return result
  }, [data, search, searchKeys, filter, filterKey, sortCol, sortDir, hasSearch, hasFilter])

  return (
    <div>
      {(hasSearch || hasFilter) && (
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          {hasSearch && (
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          {hasFilter && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {filterOptions!.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}