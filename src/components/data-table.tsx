"use client"

import { useState, useMemo } from "react"

interface Column<T> {
  key: string
  label: string
  render?: (row: T) => React.ReactNode
  className?: string
  sortFn?: (a: T, b: T) => number
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchPlaceholder?: string
  filterKey?: string
  filterOptions?: { value: string; label: string }[]
  initialFilter?: string
}

export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchPlaceholder = "Search...",
  filterKey,
  filterOptions,
  initialFilter = "",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState(initialFilter)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const filtered = useMemo(() => {
    let result = data
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((row) =>
        columns.some((col) => {
          const val = row[col.key]
          if (val == null) return false
          return String(val).toLowerCase().includes(q)
        })
      )
    }
    if (filter && filterKey) {
      result = result.filter((row) => String(row[filterKey]) === filter)
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey)
      result = [...result].sort((a, b) => {
        if (col?.sortFn) {
          return sortDir === "asc" ? col.sortFn(a, b) : -col.sortFn(a, b)
        }
        const aVal = a[sortKey]
        const bVal = b[sortKey]
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
  }, [data, search, filter, filterKey, sortKey, sortDir, columns])

  return (
    <div>
      {(filterOptions || columns.some((c) => c.key)) && (
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {filterKey && filterOptions && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`text-left px-2 py-2 text-xs font-medium text-zinc-500 cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-300 ${col.className || ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {filtered.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-zinc-500">No results found.</td></tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={String(row.id ?? i)} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/30">
                  {columns.map((col) => (
                    <td key={col.key} className={col.className || ""}>
                      {col.render ? col.render(row) : (row[col.key] != null ? String(row[col.key]) : "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-zinc-400 mt-2">
        Showing {filtered.length} of {data.length} entries
      </div>
    </div>
  )
}