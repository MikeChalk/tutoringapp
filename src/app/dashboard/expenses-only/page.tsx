import { prisma } from "@/lib/db"
import { requireAdmin, isCityAdmin, getActiveCityId, isSuperAdmin } from "@/lib/auth-helpers"
import { CityFilter } from "@/components/city-filter"
import { FinanceTimeFilter } from "@/components/finance-time-filter"
import { parseFinanceTimeFilter } from "@/lib/finance-filter"
import { EXPENSE_CATEGORIES } from "@/lib/constants"
import AddExpenseSection from "@/components/add-expense-section"
import { EmptyState } from "@/components/empty-state"
import { Receipt } from "lucide-react"
import { Suspense } from "react"
import Link from "next/link"

const CATEGORY_FILTERS = ["ALL", ...EXPENSE_CATEGORIES] as const
const CATEGORY_LABELS: Record<string, string> = {
  ALL: "All",
  TUTOR_PAY: "Tutor Payments",
  MATERIALS: "Materials",
  TRAVEL: "Travel",
  SOFTWARE: "Software",
  RENT: "Rent",
  MARKETING: "Marketing",
  OFFICE: "Office",
  OTHER: "Other",
}

function buildExpensesQs(params: Record<string, string>, base = "/dashboard/expenses-only"): string {
  const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
  return `${base}${qs ? `?${qs}` : ""}`
}

export default async function ExpensesPage(props: { searchParams: Promise<{ city?: string; category?: string; search?: string; page?: string; year?: string; from?: string; to?: string }> }) {
  const session = await requireAdmin()

  const { city: cityParam, category: catParam, search: searchParam, page: pageParam, year: yearParam, from: fromParam, to: toParam } = await props.searchParams
  const selectedCity = cityParam || "all"
  const selectedCategory = catParam || "ALL"
  const searchQuery = searchParam || ""
  const page = parseInt(pageParam || "1") || 1
  const pageSize = 50
  const superAdmin = isSuperAdmin(session.user.role)
  const cityAdminId = isCityAdmin(session.user.role) ? await getActiveCityId(session.user.role, session.user.id) : null
  const effectiveCityId = cityAdminId || (superAdmin && selectedCity !== "all" ? selectedCity : null)

  const { dateRange } = parseFinanceTimeFilter({ year: yearParam, from: fromParam, to: toParam })

  const timeQs = yearParam ? `year=${yearParam}` : fromParam && toParam ? `from=${fromParam}&to=${toParam}` : ""

  const where: Record<string, unknown> = {}
  if (effectiveCityId) {
    where.OR = [
      { cityId: effectiveCityId },
      { client: { user: { cityId: effectiveCityId } } },
    ]
  }
  if (selectedCategory !== "ALL") where.category = selectedCategory
  if (dateRange) {
    where.date = { gte: dateRange.gte, lt: dateRange.lt }
  }
  if (searchQuery) {
    const cityOr = Array.isArray(where.OR) ? where.OR as Record<string, unknown>[] : []
    where.AND = [
      ...(cityOr.length > 0 ? [{ OR: cityOr }] : []),
      { OR: [
        { description: { contains: searchQuery } },
        { client: { user: { name: { contains: searchQuery } } } },
      ] },
    ]
    delete where.OR
  }

  const [expenses, clients, totalCount] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        client: { select: { id: true, user: { select: { name: true } } } },
        hourLog: { select: { paidAt: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.findMany({
      where: effectiveCityId ? { user: { cityId: effectiveCityId } } : {},
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.expense.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / pageSize)

  const totalExpenseAgg = await prisma.expense.aggregate({ where, _sum: { amount: true } })
  const totalExpenseAmount = totalExpenseAgg._sum.amount ?? 0

  const preservedParams: Record<string, string> = {}
  if (selectedCategory !== "ALL") preservedParams.category = selectedCategory
  if (selectedCity !== "all") preservedParams.city = selectedCity
  if (timeQs) timeQs.split("&").forEach((p: string) => { const [k, v] = p.split("="); preservedParams[k] = v })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Expenses</h2>
          <p className="text-sm text-zinc-500">${totalExpenseAmount.toFixed(2)} · {totalCount} entries{dateRange ? ` · ${dateRange.label}` : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <form action="/api/expenses/seed" method="POST" data-confirm="Sync all historical hour logs as expenses?">
            <button type="submit" className="text-xs text-amber-600 dark:text-amber-400 hover:underline">Sync Historical Logs</button>
          </form>
          {superAdmin && <CityFilter selected={selectedCity} />}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Suspense fallback={null}>
          <FinanceTimeFilter />
        </Suspense>
      </div>

      <form action="/dashboard/expenses-only" method="GET" className="mb-4 flex gap-2">
        {selectedCategory !== "ALL" ? <input type="hidden" name="category" value={selectedCategory} /> : null}
        {selectedCity !== "all" ? <input type="hidden" name="city" value={selectedCity} /> : null}
        {yearParam ? <input type="hidden" name="year" value={yearParam} /> : null}
        {fromParam ? <input type="hidden" name="from" value={fromParam} /> : null}
        {toParam ? <input type="hidden" name="to" value={toParam} /> : null}
        <input type="text" name="search" key={searchQuery} defaultValue={searchQuery} placeholder="Search expenses by description or client..."
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Search</button>
        {searchQuery && <Link href={buildExpensesQs(preservedParams)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-100">Clear</Link>}
      </form>
      <AddExpenseSection clients={clients} />

      {/* Category filter toggles */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORY_FILTERS.map(cat => {
          const catParams: Record<string, string> = { ...preservedParams, category: cat }
          if (cat === "ALL") delete catParams.category
          return (
            <Link
              key={cat}
              href={buildExpensesQs(catParams)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                selectedCategory === cat
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600"
              }`}
            >
              {CATEGORY_LABELS[cat] || cat}
            </Link>
          )
        })}
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Description</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Client</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Category</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Amount</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {expenses.map(e => (
              <tr key={e.id} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                <td className="px-4 py-2.5 text-zinc-900 dark:text-zinc-100">{e.description}</td>
                <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">
                  {e.client ? (
                    <Link href={`/dashboard/clients/${e.client.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {e.client.user.name}
                    </Link>
                  ) : "-"}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    e.category === "TUTOR_PAY" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                  }`}>
                    {CATEGORY_LABELS[e.category] || e.category}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-red-600 dark:text-red-400">${e.amount.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-center">
                  {e.category === "TUTOR_PAY" ? (
                    e.hourLog?.paidAt ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Paid</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Unpaid</span>
                    )
                  ) : (
                    <span className="text-xs text-zinc-400">&mdash;</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {e.receiptFileName ? (
                    <a href={`/api/expenses/receipts?file=${e.receiptFileName}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View</a>
                  ) : (
                    <span className="text-xs text-zinc-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {expenses.length === 0 && (
          dateRange ? (
            <EmptyState icon={Receipt} title="No data for this period" description="No expenses found in the selected time range." />
          ) : (
            <div className="p-8 text-center text-sm text-zinc-500">No expenses found.</div>
          )
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {page > 1 && (
            <Link href={buildExpensesQs({ ...preservedParams, page: String(page - 1) })}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Previous
            </Link>
          )}
          <span className="text-sm text-zinc-500 px-2">Page {page} of {totalPages} ({totalCount} total)</span>
          {page < totalPages && (
            <Link href={buildExpensesQs({ ...preservedParams, page: String(page + 1) })}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}