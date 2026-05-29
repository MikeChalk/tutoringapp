import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"

export default async function PayoutsPage() {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const tutors = await prisma.tutor.findMany({
    where: { onboarded: true },
    include: {
      user: { select: { name: true, email: true } },
      hourLogs: { where: { paidAt: null }, select: { hours: true, tutorPayRate: true } },
    },
    orderBy: { user: { name: "asc" } },
  })

  const tutorsWithUnpaid = tutors
    .map(t => ({
      id: t.id,
      name: t.user.name,
      email: t.user.email,
      stripeConnected: !!t.stripeConnectId,
      unpaidHours: t.hourLogs.reduce((s, h) => s + h.hours, 0),
      unpaidAmount: t.hourLogs.reduce((s, h) => s + h.hours * h.tutorPayRate, 0),
    }))
    .filter(t => t.unpaidAmount > 0)

  const totalUnpaid = tutorsWithUnpaid.reduce((s, t) => s + t.unpaidAmount, 0)

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Payouts</h2>
      <p className="text-sm text-zinc-500 mb-6">{tutorsWithUnpaid.length} tutors with unpaid hours · ${totalUnpaid.toFixed(2)} total pending</p>

      {tutorsWithUnpaid.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
          <p className="text-zinc-500">All tutors are paid up.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Tutor</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Unpaid Hours</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Unpaid Amount</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Stripe</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {tutorsWithUnpaid.map(t => (
                <tr key={t.id} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                  <td className="px-4 py-3">
                    <span className="text-zinc-900 dark:text-zinc-100 font-medium">{t.name}</span>
                    <p className="text-xs text-zinc-400">{t.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">{t.unpaidHours.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400 font-medium">${t.unpaidAmount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    {t.stripeConnected
                      ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Connected</span>
                      : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">Not Connected</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.stripeConnected ? (
                      <form action="/api/payout" method="POST">
                        <input type="hidden" name="tutorId" value={t.id} />
                        <input type="hidden" name="amount" value={t.unpaidAmount.toFixed(2)} />
                        <button type="submit" className="text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg px-3 py-1.5 transition-colors">Pay ${t.unpaidAmount.toFixed(0)}</button>
                      </form>
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
