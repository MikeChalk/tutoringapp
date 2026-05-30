import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"

export default async function AnalyticsPage() {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const [
    totalTutors, totalClients, totalProjects,
    totalRevenue, totalPaid, totalTutorPay, totalExpenses,
    invoiceCounts, monthlyData, cityData
  ] = await Promise.all([
    prisma.tutor.count({ where: { onboarded: true } }),
    prisma.client.count(),
    prisma.project.count(),
    prisma.invoice.aggregate({ _sum: { totalAmount: true } }),
    prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { status: "PAID" } }),
    prisma.hourLog.aggregate({ _sum: { hours: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    (async () => {
      const invoices = await prisma.invoice.findMany({ select: { status: true }, where: { status: { in: ["SENT", "PAID", "DRAFT", "OVERDUE"] } } })
      return { sent: invoices.filter(i => i.status === "SENT").length, paid: invoices.filter(i => i.status === "PAID").length, draft: invoices.filter(i => i.status === "DRAFT").length, overdue: invoices.filter(i => i.status === "OVERDUE").length }
    })(),
    (async () => {
      const result: Record<string, number> = {}
      const logs = await prisma.hourLog.findMany({ select: { date: true, hours: true } })
      for (const l of logs) {
        const key = new Date(l.date).toISOString().slice(0, 7)
        result[key] = (result[key] || 0) + l.hours
      }
      return Object.entries(result).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
    })(),
    (async () => {
      const cities = await prisma.city.findMany({
        include: {
          projects: { include: { hourLogs: { select: { hours: true } } } },
        },
      })
      return cities.map(c => ({ name: c.name, projects: c.projects.length, hours: c.projects.reduce((s, p) => s + p.hourLogs.reduce((ss, h) => ss + h.hours, 0), 0) })).sort((a, b) => b.hours - a.hours)
    })(),
  ])

  const totalRevenueAmount = totalRevenue._sum.totalAmount || 0
  const totalPaidAmount = totalPaid._sum.totalAmount || 0
  const totalExpensesAmount = totalExpenses._sum.amount || 0
  const profit = totalPaidAmount - totalExpensesAmount

  const totalTutorHours = totalTutorPay._sum.hours || 0
  const totalInvoiceCount = invoiceCounts.sent + invoiceCounts.paid + invoiceCounts.draft + invoiceCounts.overdue
  const maxHours = Math.max(...monthlyData.map(([, h]) => h), 1)

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Analytics</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Revenue" value={`$${totalRevenueAmount.toFixed(0)}`} />
        <StatCard label="Paid" value={`$${totalPaidAmount.toFixed(0)}`} green />
        <StatCard label="Profit" value={`$${profit.toFixed(0)}`} green={profit > 0} />
        <StatCard label={`${totalTutors} Tutors · ${totalClients} Clients`} value={`${totalProjects} Projects`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Hours by Month</h3>
          <div className="flex items-end gap-1 h-40">
            {monthlyData.map(([month, hours]) => (
              <div key={month} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(hours / maxHours) * 100}%`, minHeight: "4px" }} />
                <span className="text-[10px] text-zinc-400 mt-1">{month.slice(5)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-400 mt-2 text-right">{totalTutorHours.toFixed(0)} total hours</p>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Invoice Status</h3>
          <div className="space-y-3">
            <StatusBar label="Paid" count={invoiceCounts.paid} total={totalInvoiceCount} color="bg-green-500" />
            <StatusBar label="Sent" count={invoiceCounts.sent} total={totalInvoiceCount} color="bg-blue-500" />
            <StatusBar label="Draft" count={invoiceCounts.draft} total={totalInvoiceCount} color="bg-zinc-400" />
            <StatusBar label="Overdue" count={invoiceCounts.overdue} total={totalInvoiceCount} color="bg-red-500" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">By City</h3>
        <div className="space-y-2">
          {cityData.map(c => (
            <div key={c.name} className="flex items-center gap-3 text-sm">
              <span className="w-24 text-zinc-700 dark:text-zinc-300 font-medium">{c.name}</span>
              <div className="flex-1 bg-zinc-100 dark:bg-zinc-700 rounded-full h-4 overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${cityData[0].hours > 0 ? (c.hours / cityData[0].hours) * 100 : 0}%` }} />
              </div>
              <span className="w-16 text-right text-zinc-500">{c.hours.toFixed(0)}h</span>
              <span className="w-16 text-right text-zinc-400">{c.projects} proj</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
      <p className="text-xs text-zinc-500 uppercase">{label}</p>
      <p className={`text-2xl font-bold ${green ? "text-green-600 dark:text-green-400" : "text-zinc-900 dark:text-zinc-100"}`}>{value}</p>
    </div>
  )
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-500 w-16">{label}</span>
      <div className="flex-1 bg-zinc-100 dark:bg-zinc-700 rounded-full h-3 overflow-hidden">
        <div className={`${color} h-full rounded-full`} style={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }} />
      </div>
      <span className="text-xs text-zinc-600 dark:text-zinc-400 w-8 text-right">{count}</span>
    </div>
  )
}
