import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/auth-helpers"
import Link from "next/link"
import { addDays } from "date-fns"
import { PayoutFrequencySelect } from "@/components/payout-frequency-select"

function getNextPayout(frequency: string, lastPayout: Date | null): string | null {
  if (frequency === "manual" || !lastPayout) return null
  const now = new Date()
  if (frequency === "weekly") {
    let next = addDays(lastPayout, 7)
    while (next <= now) next = addDays(next, 7)
    return next.toISOString().split("T")[0]
  }
  if (frequency === "biweekly") {
    let next = addDays(lastPayout, 14)
    while (next <= now) next = addDays(next, 14)
    return next.toISOString().split("T")[0]
  }
  if (frequency === "monthly") {
    let next = new Date(lastPayout)
    next.setMonth(next.getMonth() + 1)
    while (next <= now) next.setMonth(next.getMonth() + 1)
    return next.toISOString().split("T")[0]
  }
  return null
}

export default async function PayrollPage() {
  await requireAdmin()

  const settings = await prisma.companySettings.findUnique({ where: { id: "main" } })
  const frequency = settings?.payoutFrequency || "manual"
  const nextPayout = getNextPayout(frequency, settings?.lastPayoutAt ?? null)

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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">Payroll</h2>
          <p className="text-sm text-zinc-500">
            ${totalUnpaid.toFixed(2)} unpaid · ${totalPaid.toFixed(2)} paid · {expenses.length} total entries
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PayoutFrequencySelect defaultValue={frequency} />
          {nextPayout && (
            <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-2 py-1.5">
              Next: {new Date(nextPayout + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
          )}
          {settings?.lastPayoutAt && (
            <span className="text-xs text-zinc-400">
              Last: {new Date(settings.lastPayoutAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

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
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Tutor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Project</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {unpaid.map(e => (
                <tr key={e.id} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{e.hourLog?.tutor?.user?.name || "-"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{e.hourLog?.project?.name || e.description}</td>
                  <td className="px-4 py-3 text-right font-medium text-amber-600 dark:text-amber-400">${e.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    {e.hourLog && (
                      <form action={`/api/hours/${e.hourLog.id}/pay`} method="POST" data-confirm={`Mark $${e.amount.toFixed(2)} as paid?`}>
                        <button type="submit" className="text-xs rounded bg-green-600 px-2 py-1 text-white hover:bg-green-700 transition-colors">Pay</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {unpaid.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">All paid up.</td></tr>
              )}
            </tbody>
          </table>
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
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Tutor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Project</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {paid.map(e => (
                <tr key={e.id} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{e.hourLog?.tutor?.user?.name || "-"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{e.hourLog?.project?.name || e.description}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">${e.amount.toFixed(2)}</td>
                </tr>
              ))}
              {paid.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-500">No payments yet.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  )
}
