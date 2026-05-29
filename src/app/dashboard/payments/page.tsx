import { prisma } from "@/lib/db"
import { requireAuth, isTutor, getTutorId } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"

export default async function PaymentsPage() {
  const session = await requireAuth()
  if (!isTutor(session.user.role)) redirect("/dashboard")

  const tutorId = await getTutorId(session.user.id, session.user.email)
  if (!tutorId) redirect("/dashboard")

  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId } })

  const hourLogs = await prisma.hourLog.findMany({
    where: { tutorId },
    include: { project: { select: { name: true } } },
    orderBy: { date: "desc" },
  })

  const totalHours = hourLogs.reduce((sum, h) => sum + h.hours, 0)
  const totalPayOwed = hourLogs.reduce((sum, h) => sum + h.hours * h.tutorPayRate, 0)
  const totalPaid = hourLogs.filter((h) => h.paidAt).reduce((sum, h) => sum + h.hours * h.tutorPayRate, 0)
  const totalUnpaid = totalPayOwed - totalPaid

  // Group by month for period summary
  const monthlyGrouped: Record<string, { hours: number; pay: number }> = {}
  for (const log of hourLogs) {
    const key = new Date(log.date).toISOString().slice(0, 7)
    if (!monthlyGrouped[key]) monthlyGrouped[key] = { hours: 0, pay: 0 }
    monthlyGrouped[key].hours += log.hours
    monthlyGrouped[key].pay += log.hours * log.tutorPayRate
  }

  const stripes = !!process.env.STRIPE_SECRET_KEY
  const bankLinked = !!tutor?.stripeConnectId

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">My Payments</h2>

      {stripes && (
        <div className={`rounded-xl border p-4 mb-6 ${bankLinked ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700" : "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {bankLinked ? "Bank Account Connected" : "Bank Account Not Connected"}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {bankLinked ? "Ready to receive payouts via Stripe." : "Connect your bank account to receive payouts."}
              </p>
            </div>
            {!bankLinked && (
              <form action="/api/stripe/connect" method="POST">
                <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 transition-colors">Connect Account</button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Hours" value={totalHours.toString()} />
        <StatCard label="Total Pay Owed" value={`$${totalPayOwed.toFixed(2)}`} />
        <StatCard label="Total Paid" value={`$${totalPaid.toFixed(2)}`} green />
        <StatCard label="Total Unpaid" value={`$${totalUnpaid.toFixed(2)}`} amber />
      </div>

      {Object.keys(monthlyGrouped).length > 0 && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Payment Periods</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-4 py-2 text-xs font-medium text-zinc-500">Period</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">Hours</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-zinc-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(monthlyGrouped).sort(([a], [b]) => b.localeCompare(a)).map(([month, data]) => (
                <tr key={month} className="text-sm border-b border-zinc-100 dark:border-zinc-700/50">
                  <td className="px-4 py-2 text-zinc-900 dark:text-zinc-100 font-medium">{month}</td>
                  <td className="px-4 py-2 text-right text-zinc-600 dark:text-zinc-400">{data.hours.toFixed(1)}</td>
                  <td className="px-4 py-2 text-right text-green-600 dark:text-green-400 font-medium">${data.pay.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Student</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Mode</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Hours</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Pay Rate</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {hourLogs.map((log) => (
              <tr key={log.id} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{new Date(log.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{log.project.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${log.mode === "ONLINE" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"}`}>{log.mode === "ONLINE" ? "Online" : "In Person"}</span>
                </td>
                <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-100">{log.hours}</td>
                <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">${log.tutorPayRate.toFixed(2)}/hr</td>
                <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">${(log.hours * log.tutorPayRate).toFixed(2)}</td>
                <td className="px-4 py-3">
                  {log.paidAt ? <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Paid {new Date(log.paidAt).toLocaleDateString()}</span>
                  : <span className="text-xs text-zinc-400">Unpaid</span>}
                </td>
              </tr>
            ))}
            {hourLogs.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">No hours logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value, green, amber }: { label: string; value: string; green?: boolean; amber?: boolean }) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
      <p className="text-xs text-zinc-500 uppercase">{label}</p>
      <p className={`text-2xl font-bold ${green ? "text-green-600 dark:text-green-400" : amber ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100"}`}>{value}</p>
    </div>
  )
}
