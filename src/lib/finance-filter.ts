import { getMontrealNow } from "@/lib/greeting"

export interface FinanceDateRange {
  gte: Date
  lt: Date
  label: string
}

function utcYearBoundaries(year: number): { gte: Date; lt: Date } {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  }
}

function utcDayStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

function nextUtcDay(dateStr: string): Date {
  const ms = new Date(`${dateStr}T00:00:00.000Z`).getTime() + 86400000
  const d = new Date(ms)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function montrealYearBoundaries(year: number): { gte: Date; lt: Date } {
  const gte = new Date(new Date(`${year}-01-01T00:00:00`).toLocaleString("en-US", { timeZone: "America/Montreal" }))
  const lt = new Date(new Date(`${year + 1}-01-01T00:00:00`).toLocaleString("en-US", { timeZone: "America/Montreal" }))
  return { gte, lt }
}

function montrealDayStart(dateStr: string): Date {
  return new Date(new Date(`${dateStr}T00:00:00`).toLocaleString("en-US", { timeZone: "America/Montreal" }))
}

function montrealNextDay(dateStr: string): Date {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  const nextDayStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
  return new Date(new Date(`${nextDayStr}T00:00:00`).toLocaleString("en-US", { timeZone: "America/Montreal" }))
}

export interface ParsedFinanceFilter {
  dateRange: FinanceDateRange | null
  localDateRange: FinanceDateRange | null
}

export function parseFinanceTimeFilter(searchParams: Record<string, string | undefined>): ParsedFinanceFilter {
  const currentYear = getMontrealNow().getFullYear()

  const yearParam = searchParams.year
  const fromParam = searchParams.from
  const toParam = searchParams.to

  let dateRange: FinanceDateRange | null = null
  let localDateRange: FinanceDateRange | null = null

  if (fromParam && toParam) {
    const from = new Date(fromParam)
    const to = new Date(toParam)
    if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && to >= from) {
      dateRange = {
        gte: utcDayStart(fromParam),
        lt: nextUtcDay(toParam),
        label: `${fromParam} – ${toParam}`,
      }
      localDateRange = {
        gte: montrealDayStart(fromParam),
        lt: montrealNextDay(toParam),
        label: `${fromParam} – ${toParam}`,
      }
    }
  }

  if (!dateRange && yearParam) {
    const year = parseInt(yearParam)
    if (year >= 2020 && year <= currentYear + 1) {
      const utcBounds = utcYearBoundaries(year)
      dateRange = { gte: utcBounds.gte, lt: utcBounds.lt, label: String(year) }
      const localBounds = montrealYearBoundaries(year)
      localDateRange = { gte: localBounds.gte, lt: localBounds.lt, label: String(year) }
    }
  }

  if (!dateRange) {
    const utcBounds = utcYearBoundaries(currentYear)
    dateRange = { gte: utcBounds.gte, lt: utcBounds.lt, label: String(currentYear) }
    const localBounds = montrealYearBoundaries(currentYear)
    localDateRange = { gte: localBounds.gte, lt: localBounds.lt, label: String(currentYear) }
  }

  return {
    dateRange,
    localDateRange,
  }
}

export function defaultFinanceYear(): number {
  return getMontrealNow().getFullYear()
}