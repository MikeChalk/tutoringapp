import { prisma } from "@/lib/db"
import { requireAuth, isSuperAdmin, isCityAdmin, getActiveCityId } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { CityFilter } from "@/components/city-filter"
import AddExpenseForm from "@/components/add-expense-form"

export default async function ExpensesPage(props: { searchParams: Promise<{ city?: string }> }) {
  const session = await requireAuth()
  const role = session.user.role
  if (role !== "ADMIN" && role !== "CITY_ADMIN") redirect("/dashboard")

  const { city: cityParam } = await props.searchParams
  const selectedCity = cityParam || "all"
  const superAdmin = isSuperAdmin(role)
  const cityAdminId = isCityAdmin(role) ? await getActiveCityId(role, session.user.id) : null
  const effectiveCityId = cityAdminId || (superAdmin && selectedCity !== "all" ? selectedCity : null)

  const cities = await prisma.city.findMany({ select: { id: true, name: true } })

  const cityFilter = effectiveCityId
    ? { project: { cityId: effectiveCityId } }
    : {}
  const expenseCityFilter = effectiveCityId
    ? { cityId: effectiveCityId }
    : {}
  const invoiceCityFilter = effectiveCityId
    ? { client: { user: { cityId: effectiveCityId } } }
    : {}

  const [hourLogs, expenses, invoices, allInvoices, allExpenses, clients] = await Promise.all([
    prisma.hourLog.findMany({
      where: cityFilter,
      include: {
        tutor: { include: { user: { select: { name: true } } } },
        project: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({
      where: expenseCityFilter,
      include: { client: { select: { user: { select: { name: true } } } } },
      orderBy: { date: "desc" },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PAID"] }, ...invoiceCityFilter },
      select: { totalAmount: true, status: true },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PAID"] } },
      select: { totalAmount: true, status: true, client: { select: { user: { select: { cityId: true } } } } },
    }),
    prisma.expense.findMany({
      select: { amount: true, cityId: true },
    }),
    prisma.client.findMany({
      where: effectiveCityId ? { user: { cityId: effectiveCityId } } : {},
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ])

  const totalBilled = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const totalPaidInvoices = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.totalAmount, 0)
  const totalTutorPay = hourLogs.reduce((s, h) => s + h.hours * h.tutorPayRate, 0)
  const totalTutorPaid = hourLogs.filter((h) => h.paidAt).reduce((s, h) => s + h.hours * h.tutorPayRate, 0)
  const totalOtherExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  const cityName = selectedCity !== "all" ? cities.find((c) => c.id === selectedCity)?.name || selectedCity : "All Cities"

  // Per-city breakdown
  const cityBreakdown = cities.map((city) => {
    const cityInvoices = allInvoices.filter((i) => i.client.user.cityId === city.id)
    const cityExpenses = allExpenses.filter((e) => e.cityId === city.id)
    const billed = cityInvoices.reduce((s, i) => s + i.totalAmount, 0)
    const collected = cityInvoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.totalAmount, 0)
    const expensesAmt = cityExpenses.reduce((s, e) => s + e.amount, 0)
    return { name: city.name, billed, collected, expenses: expensesAmt }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Finance</h2>
          <p className="text-sm text-zinc-500">{cityName}</p>
        </div>
        {superAdmin && <CityFilter selected={selectedCity} />}
      </div>

      {superAdmin && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">City</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Billed</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Collected</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Expenses</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {cityBreakdown.map((c) => (
                <tr key={c.name} className="text-sm">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{c.name}</td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">${c.billed.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">${c.collected.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">${c.expenses.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-100">${(c.collected - c.expenses).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Gross Revenue</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">${totalBilled.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">All invoiced amounts</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Net Revenue</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">${totalPaidInvoices.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">Collected invoices</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Tutor Cost</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">${totalTutorPay.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">${totalTutorPaid.toFixed(2)} paid</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Profit</p>
          <p className={`text-2xl font-bold ${totalPaidInvoices - totalTutorPaid - totalOtherExpenses >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            ${(totalPaidInvoices - totalTutorPaid - totalOtherExpenses).toFixed(2)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">Revenue - all costs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Revenue Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Total Invoiced</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">${totalBilled.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Total Collected</span>
              <span className="font-medium text-green-600 dark:text-green-400">${totalPaidInvoices.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Outstanding</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">${(totalBilled - totalPaidInvoices).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Expense Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Tutor Pay (All)</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">${totalTutorPay.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Tutor Pay (Paid)</span>
              <span className="font-medium text-green-600 dark:text-green-400">${totalTutorPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Other Expenses</span>
              <span className="font-medium text-red-600 dark:text-red-400">${totalOtherExpenses.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Total Costs</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">${(totalTutorPaid + totalOtherExpenses).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Tutor Payments</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Date</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Tutor</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Student</th>
                  <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Hrs</th>
                  <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Rate</th>
                  <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Amount</th>
                  <th className="text-center px-2 py-2 text-xs font-medium text-zinc-500">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                {hourLogs.slice(0, 30).map((log) => (
                  <tr key={log.id} className="text-sm">
                    <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">{new Date(log.date).toLocaleDateString()}</td>
                    <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">{log.tutor.user.name}</td>
                    <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">{log.project.name}</td>
                    <td className="px-2 py-2 text-right text-zinc-900 dark:text-zinc-100">{log.hours}</td>
                    <td className="px-2 py-2 text-right text-zinc-600 dark:text-zinc-400">${log.tutorPayRate.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right font-medium text-amber-600 dark:text-amber-400">${(log.hours * log.tutorPayRate).toFixed(2)}</td>
                    <td className="px-2 py-2">
                      <form action={`/api/hours/${log.id}`} method="POST">
                        <input type="hidden" name="_action" value="pay" />
                        <button type="submit" className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          log.paidAt
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}>
                          {log.paidAt ? "Paid" : "Unpaid"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <AddExpenseForm clients={clients} />

          {expenses.length > 0 && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Additional Expenses</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Date</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Description</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Client</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Category</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Amount</th>
                    <th className="text-center px-2 py-2 text-xs font-medium text-zinc-500">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {expenses.map((e) => (
                    <tr key={e.id} className="text-sm">
                      <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">{e.description}</td>
                      <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">{e.client?.user?.name || "-"}</td>
                      <td className="px-2 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          e.category === "TUTOR_PAY" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                        }`}>
                          {e.category === "TUTOR_PAY" ? "Tutor Pay" : e.category}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-medium text-red-600 dark:text-red-400">${e.amount.toFixed(2)}</td>
                      <td className="px-2 py-2 text-center">
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
          )}
        </div>
          </div>

          {/* Tutor Payment Summary */}
          {(() => {
            const tutorMap = new Map<string, { name: string; totalOwed: number; totalPaid: number; count: number }>()
            for (const log of hourLogs) {
              const name = log.tutor.user.name
              const amount = log.hours * log.tutorPayRate
              const existing = tutorMap.get(name) || { name, totalOwed: 0, totalPaid: 0, count: 0 }
              existing.totalOwed += amount
              existing.count++
              if (log.paidAt) existing.totalPaid += amount
              tutorMap.set(name, existing)
            }
            const summaries = [...tutorMap.values()].sort((a, b) => b.totalOwed - a.totalOwed)

            if (summaries.length === 0) return null
            return (
              <div className="mt-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Payment Summary by Tutor</h3>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                      <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500">Tutor</th>
                      <th className="text-center px-3 py-2 text-xs font-medium text-zinc-500">Sessions</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-zinc-500">Total Owed</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-zinc-500">Paid</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-zinc-500">Unpaid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                    {summaries.map(s => (
                      <tr key={s.name} className="text-sm">
                        <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">{s.name}</td>
                        <td className="px-3 py-2 text-center text-zinc-500">{s.count}</td>
                        <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">${s.totalOwed.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">${s.totalPaid.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-amber-600 dark:text-amber-400">${(s.totalOwed - s.totalPaid).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
  )
}
