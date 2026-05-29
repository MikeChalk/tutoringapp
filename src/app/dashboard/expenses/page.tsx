import { prisma } from "@/lib/db"
import { requireAuth, isSuperAdmin, isCityAdmin, getActiveCityId } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { StatusBadge } from "@/components/ui"
import { CityFilter } from "@/components/city-filter"

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

  const [hourLogs, expenses, invoices, allInvoices, allExpenses] = await Promise.all([
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
                      {log.paidAt ? <StatusBadge status="PAID" /> : <span className="text-xs text-zinc-400">Unpaid</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Add Expense</h3>
            <form action="/api/expenses" method="POST" className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Description</label>
                <input type="text" name="description" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Amount ($)</label>
                  <input type="number" name="amount" required min="0" step="0.01" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Category</label>
                  <select name="category" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="OTHER">Other</option>
                    <option value="SOFTWARE">Software</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="SUPPLIES">Supplies</option>
                    <option value="RENT">Rent</option>
                    <option value="TRAVEL">Travel</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Date</label>
                <input type="date" name="date" required defaultValue={new Date().toISOString().split("T")[0]} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" className="w-full rounded-lg bg-zinc-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity">Add Expense</button>
            </form>
          </div>

          {expenses.length > 0 && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Additional Expenses</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Date</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Description</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Category</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {expenses.map((e) => (
                    <tr key={e.id} className="text-sm">
                      <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">{e.description}</td>
                      <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">{e.category}</td>
                      <td className="px-2 py-2 text-right font-medium text-red-600 dark:text-red-400">${e.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
