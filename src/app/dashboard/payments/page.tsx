import { prisma } from "@/lib/db"
import { requireAuth, isTutor, getTutorId } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"

export default async function PaymentsPage() {
  const session = await requireAuth()
  if (!isTutor(session.user.role)) redirect("/dashboard")

  const tutorId = await getTutorId(session.user.id, session.user.email)
  if (!tutorId) redirect("/dashboard")

  const hourLogs = await prisma.hourLog.findMany({
    where: { tutorId },
    include: { project: { select: { name: true } } },
    orderBy: { date: "desc" },
  })

  const totalHours = hourLogs.reduce((sum, h) => sum + h.hours, 0)
  const totalPayOwed = hourLogs.reduce((sum, h) => sum + h.hours * h.tutorPayRate, 0)
  const totalPaid = hourLogs.filter((h) => h.paidAt).reduce((sum, h) => sum + h.hours * h.tutorPayRate, 0)
  const totalUnpaid = totalPayOwed - totalPaid

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">My Payments</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Total Hours</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalHours}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Total Pay Owed</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">${totalPayOwed.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Total Paid</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">${totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Total Unpaid</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">${totalUnpaid.toFixed(2)}</p>
        </div>
      </div>

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
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Paid On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {hourLogs.map((log) => (
              <tr key={log.id} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {new Date(log.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{log.project.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    log.mode === "ONLINE" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
                  }`}>{log.mode === "ONLINE" ? "Online" : "In Person"}</span>
                </td>
                <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-100">{log.hours}</td>
                <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">${log.tutorPayRate.toFixed(2)}/hr</td>
                <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">${(log.hours * log.tutorPayRate).toFixed(2)}</td>
                <td className="px-4 py-3">
                  {log.paidAt ? (
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                      {new Date(log.paidAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-400">Unpaid</span>
                  )}
                </td>
              </tr>
            ))}
            {hourLogs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">No hours logged yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
