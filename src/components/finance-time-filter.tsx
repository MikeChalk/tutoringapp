"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useState, useEffect, useCallback, useRef } from "react"

type FilterMode = "year" | "custom"

interface FinanceTimeFilterProps {}

function readSession(): { mode: FilterMode; year: string; from: string; to: string } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem("finance-time-filter")
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") {
      if (parsed.mode === "month") parsed.mode = "year"
      if (parsed.mode === "year" || parsed.mode === "custom") return parsed
    }
  } catch { /* ignore */ }
  return null
}

function writeSession(state: { mode: FilterMode; year: string; from: string; to: string }) {
  try {
    sessionStorage.setItem("finance-time-filter", JSON.stringify(state))
  } catch { /* ignore */ }
}

function buildUrl(pathname: string, searchParams: URLSearchParams, mode: FilterMode, year: string, from: string, to: string): string {
  const params = new URLSearchParams()

  const cityParam = searchParams.get("city")
  if (cityParam) params.set("city", cityParam)
  const statusParam = searchParams.get("status")
  if (statusParam) params.set("status", statusParam)
  const categoryParam = searchParams.get("category")
  if (categoryParam) params.set("category", categoryParam)
  const searchParam = searchParams.get("search")
  if (searchParam) params.set("search", searchParam)
  const pageParam = searchParams.get("page")
  if (pageParam) params.set("page", pageParam)

  if (mode === "year") {
    params.set("year", year)
  } else if (mode === "custom" && from && to) {
    params.set("from", from)
    params.set("to", to)
  }

  const qs = params.toString()
  return `${pathname}${qs ? `?${qs}` : ""}`
}

interface FilterState {
  mode: FilterMode
  year: string
  from: string
  to: string
}

export function FinanceTimeFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentYear = new Date().getFullYear()
  const urlYear = searchParams.get("year") || ""
  const urlFrom = searchParams.get("from") || ""
  const urlTo = searchParams.get("to") || ""

  const [filter, setFilter] = useState<FilterState>(() => {
    if (urlFrom && urlTo) return { mode: "custom", year: urlYear || String(currentYear), from: urlFrom, to: urlTo }
    return { mode: "year", year: urlYear || String(currentYear), from: "", to: "" }
  })
  const [customHint, setCustomHint] = useState("")

  const hydrated = useRef(false)
  useEffect(() => {
    if (hydrated.current) return
    hydrated.current = true
    if (urlYear || urlFrom || urlTo) return
    const saved = readSession()
    if (!saved) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate filter preferences from sessionStorage
    setFilter(saved)
    const url = buildUrl(pathname, searchParams, saved.mode, saved.year, saved.from, saved.to)
    router.replace(url)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hydrated.current) return
    writeSession(filter)
  }, [filter])

  const navigate = useCallback((m: FilterMode, y: string, f: string, t: string, replace: boolean) => {
    setCustomHint("")
    const url = buildUrl(pathname, searchParams, m, y, f, t)
    if (replace) router.replace(url)
    else router.push(url)
  }, [pathname, searchParams, router])

  const handleModeChange = (newMode: FilterMode) => {
    setFilter(prev => ({ ...prev, mode: newMode }))
    setCustomHint("")
    if (newMode === "year") {
      navigate("year", String(currentYear), "", "", false)
    }
  }

  const handleFromChange = (value: string) => {
    setFilter(prev => ({ ...prev, from: value }))
    if (value && filter.to) {
      const fDate = new Date(value)
      const tDate = new Date(filter.to)
      if (tDate >= fDate) {
        navigate("custom", "", value, filter.to, false)
      } else {
        setCustomHint("End date must be after start date")
      }
    } else if (value && !filter.to) {
      setCustomHint("Select an end date to apply")
    }
  }

  const handleToChange = (value: string) => {
    setFilter(prev => ({ ...prev, to: value }))
    if (filter.from && value) {
      const fDate = new Date(filter.from)
      const tDate = new Date(value)
      if (tDate >= fDate) {
        navigate("custom", "", filter.from, value, false)
      } else {
        setCustomHint("End date must be after start date")
      }
    } else if (filter.from && !value) {
      setCustomHint("Select an end date to apply")
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-600 overflow-hidden">
        <button
          onClick={() => handleModeChange("year")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            filter.mode === "year"
              ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
              : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          }`}
        >
          This Year
        </button>
        <button
          onClick={() => handleModeChange("custom")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-zinc-300 dark:border-zinc-600 ${
            filter.mode === "custom"
              ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
              : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          }`}
        >
          Custom
        </button>
      </div>

      {filter.mode === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filter.from}
            onChange={(e) => handleFromChange(e.target.value)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-zinc-500">to</span>
          <input
            type="date"
            value={filter.to}
            onChange={(e) => handleToChange(e.target.value)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {customHint && (
        <span className="text-xs text-amber-600 dark:text-amber-400">{customHint}</span>
      )}
    </div>
  )
}