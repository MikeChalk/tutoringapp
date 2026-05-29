import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { StatusBadge } from "@/components/ui"

export default async function ExpensesPage() {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const [hourLogs, expenses, invoices] = await Promise.all([
    prisma.hourLog.findMany({
      include: {
        tutor: { include: { user: { select: { name: true } } } },
        project: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({ orderBy: { date: "desc" } }),
    prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PAID"] } },
      select: { totalAmount: true, status: true },
    }),
  ])

  const totalBilled = invoices.reduce((s, i) => s + i.totalAmount, 0)
  const totalPaidInvoices = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.totalAmount, 0)
  const totalTutorPay = hourLogs.reduce((s, h) => s + h.hours * h.tutorPayRate, 0)
  const totalTutorPaid = hourLogs.filter((h) => h.paidAt).reduce((s, h) => s + h.hours * h.tutorPayRate, 0)
  const totalOtherExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netExpenses = totalTutorPay + totalOtherExpenses

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Expenses</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Gross Revenue</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">${totalBilled.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">All invoiced amounts</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Tutor Pay</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">${totalTutorPay.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">${totalTutorPaid.toFixed(2)} paid</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Other Expenses</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">${totalOtherExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Net</p>
          <p className={`text-2xl font-bold ${totalPaidInvoices - totalTutorPaid - totalOtherExpenses >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            ${(totalPaidInvoices - totalTutorPaid - totalOtherExpenses).toFixed(2)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">After all expenses</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Tutor Payments (Subcontractor)</h3>
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
                      {log.paidAt ? (
                        <StatusBadge status="PAID" />
                      ) : (
                        <span className="text-xs text-zinc-400">Unpaid</span>
                      )}
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
                <input type="text" name="description" required
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Amount ($)</label>
                  <input type="number" name="amount" required min="0" step="0.01"
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Category</label>
                  <select name="category"
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                <input type="date" name="date" required defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit"
                className="w-full rounded-lg bg-zinc-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity">
                Add Expense
              </button>
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
