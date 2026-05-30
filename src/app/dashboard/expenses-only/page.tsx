import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isCityAdmin, getActiveCityId, isSuperAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { CityFilter } from "@/components/city-filter"
import Link from "next/link"

const CATEGORIES = ["ALL", "TUTOR_PAY", "SOFTWARE", "MARKETING", "SUPPLIES", "RENT", "TRAVEL", "OTHER"]
const CATEGORY_LABELS: Record<string, string> = {
  ALL: "All",
  TUTOR_PAY: "Tutor Payments",
  SOFTWARE: "Software",
  MARKETING: "Marketing",
  SUPPLIES: "Supplies",
  RENT: "Rent",
  TRAVEL: "Travel",
  OTHER: "Other",
}

export default async function ExpensesPage(props: { searchParams: Promise<{ city?: string; category?: string }> }) {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const { city: cityParam, category: catParam } = await props.searchParams
  const selectedCity = cityParam || "all"
  const selectedCategory = catParam || "ALL"
  const superAdmin = isSuperAdmin(session.user.role)
  const cityAdminId = isCityAdmin(session.user.role) ? await getActiveCityId(session.user.role, session.user.id) : null
  const effectiveCityId = cityAdminId || (superAdmin && selectedCity !== "all" ? selectedCity : null)

  const where: Record<string, unknown> = {}
  if (effectiveCityId) where.cityId = effectiveCityId
  if (selectedCategory !== "ALL") where.category = selectedCategory

  const expenses = await prisma.expense.findMany({
    where,
    include: { client: { select: { id: true, user: { select: { name: true } } } } },
    orderBy: { date: "desc" },
  })

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Expenses</h2>
          <p className="text-sm text-zinc-500">${totalAmount.toFixed(2)} total · {expenses.length} entries</p>
        </div>
        {superAdmin && <CityFilter selected={selectedCity} />}
      </div>

      {/* Category filter toggles */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map(cat => (
          <Link
            key={cat}
            href={`/dashboard/expenses-only?category=${cat}${selectedCity !== "all" ? `&city=${selectedCity}` : ""}`}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              selectedCategory === cat
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600"
            }`}
          >
            {CATEGORY_LABELS[cat] || cat}
          </Link>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Description</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Client</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Category</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Amount</th>
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
        {expenses.length === 0 && (
          <div className="p-8 text-center text-sm text-zinc-500">No expenses found.</div>
        )}
      </div>
    </div>
  )
}
