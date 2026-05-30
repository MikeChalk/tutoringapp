import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function PayoutsPage() {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  // Use expenses as source of truth — matches the Expenses page
  const expenses = await prisma.expense.findMany({
    where: { category: "TUTOR_PAY" },
    include: {
      hourLog: {
        include: { tutor: { include: { user: { select: { name: true, email: true } } } } },
      },
    },
    orderBy: { date: "desc" },
  })

  // Group unpaid expenses by tutor
  const tutorMap = new Map<string, {
    id: string; name: string; email: string; stripeConnected: boolean
    unpaid: number; paid: number; total: number
  }>()

  for (const e of expenses) {
    const tutor = e.hourLog?.tutor
    if (!tutor) continue
    const key = tutor.id
    const existing = tutorMap.get(key) || {
      id: tutor.id,
      name: tutor.user.name,
      email: tutor.user.email,
      stripeConnected: !!tutor.stripeConnectId,
      unpaid: 0,
      paid: 0,
      total: 0,
    }
    existing.total += e.amount
    if (e.hourLog?.paidAt) {
      existing.paid += e.amount
    } else {
      existing.unpaid += e.amount
    }
    tutorMap.set(key, existing)
  }

  const tutors = [...tutorMap.values()].sort((a, b) => b.unpaid - a.unpaid)
  const totalUnpaid = tutors.reduce((s, t) => s + t.unpaid, 0)
  const totalPaid = tutors.reduce((s, t) => s + t.paid, 0)
  const totalAll = tutors.reduce((s, t) => s + t.total, 0)

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Payouts</h2>
      <p className="text-sm text-zinc-500 mb-1">
        {tutors.filter(t => t.unpaid > 0).length} tutors with unpaid · ${totalUnpaid.toFixed(2)} pending · ${totalAll.toFixed(2)} total
      </p>
      <p className="text-xs text-zinc-400 mb-6">
        Data from <Link href="/dashboard/expenses-only?category=TUTOR_PAY" className="text-blue-600 dark:text-blue-400 hover:underline">Expenses → Tutor Payments</Link>
      </p>

      {tutors.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
          <p className="text-zinc-500">No tutor payment expenses yet. Log some hours first.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Tutor</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Total</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Unpaid</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Paid</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Stripe</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {tutors.map(t => (
                <tr key={t.id} className={`text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50 ${t.unpaid === 0 ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <span className="text-zinc-900 dark:text-zinc-100 font-medium">{t.name}</span>
                    <p className="text-xs text-zinc-400">{t.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">${t.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400 font-medium">${t.unpaid.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">${t.paid.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    {t.stripeConnected
                      ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Connected</span>
                      : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">Not Connected</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.stripeConnected && t.unpaid > 0 ? (
                      <form action="/api/payout" method="POST">
                        <input type="hidden" name="tutorId" value={t.id} />
                        <input type="hidden" name="amount" value={t.unpaid.toFixed(2)} />
                        <button type="submit" className="text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg px-3 py-1.5 transition-colors">Pay ${t.unpaid.toFixed(0)}</button>
                      </form>
                    ) : t.unpaid === 0 ? (
                      <span className="text-xs text-green-600 dark:text-green-400">Paid up</span>
                    ) : (
                      <span className="text-xs text-zinc-400">Needs bank connection</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
