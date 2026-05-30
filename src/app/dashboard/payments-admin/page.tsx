import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function PayoutsPage() {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const expenses = await prisma.expense.findMany({
    where: { category: "TUTOR_PAY" },
    include: {
      client: { select: { user: { select: { name: true } } } },
      hourLog: {
        include: {
          tutor: { include: { user: { select: { name: true, email: true } } } },
          project: { select: { name: true } },
        },
      },
    },
    orderBy: { date: "desc" },
  })

  const unpaid = expenses.filter(e => !e.hourLog?.paidAt)
  const paid = expenses.filter(e => e.hourLog?.paidAt)
  const totalPaid = paid.reduce((s, e) => s + e.amount, 0)
  const totalUnpaid = unpaid.reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Payouts</h2>
      <p className="text-sm text-zinc-500 mb-1">
        ${totalUnpaid.toFixed(2)} unpaid · ${totalPaid.toFixed(2)} paid · {expenses.length} total entries
      </p>
      <p className="text-xs text-zinc-400 mb-6">
        Data from <Link href="/dashboard/expenses-only?category=TUTOR_PAY" className="text-blue-600 dark:text-blue-400 hover:underline">Expenses</Link>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Unpaid</h3>
            <p className="text-xs text-zinc-500">{unpaid.length} entries · ${totalUnpaid.toFixed(2)}</p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500">Date</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500">Tutor</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500">Project</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-zinc-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {unpaid.map(e => (
                <tr key={e.id} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                  <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-zinc-900 dark:text-zinc-100">{e.hourLog?.tutor?.user?.name || "-"}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{e.hourLog?.project?.name || e.description}</td>
                  <td className="px-3 py-2 text-right font-medium text-amber-600 dark:text-amber-400">${e.amount.toFixed(2)}</td>
                </tr>
              ))}
              {unpaid.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-zinc-500">All paid up.</td></tr>
              )}
</tbody>
           </table>
          </div>
        </div>
      </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Paid</h3>
            <p className="text-xs text-zinc-500">{paid.length} entries · ${totalPaid.toFixed(2)}</p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500">Date</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500">Tutor</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500">Project</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-zinc-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {paid.map(e => (
                <tr key={e.id} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                  <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-zinc-900 dark:text-zinc-100">{e.hourLog?.tutor?.user?.name || "-"}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{e.hourLog?.project?.name || e.description}</td>
                  <td className="px-3 py-2 text-right font-medium text-green-600 dark:text-green-400">${e.amount.toFixed(2)}</td>
                </tr>
              ))}
              {paid.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-zinc-500">No payments yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
