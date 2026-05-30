import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function DataHealthPage() {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const checks: { label: string; status: "ok" | "warn" | "error"; count: number; detail: string; href?: string }[] = []

  // 1. Clients: compare hour log billing sum vs invoice total
  const clients = await prisma.client.findMany({
    include: {
      user: { select: { name: true } },
      projects: { include: { hourLogs: { where: { invoiceItems: { none: {} } } } } },
      invoices: { select: { totalAmount: true } },
    },
  })

  let badInvoiceClients = 0
  for (const c of clients) {
    const billedFromLogs = c.projects.reduce((sum, p) => sum + p.hourLogs.reduce((s, h) => s + h.hours * h.billingRate, 0), 0)
    const totalInvoiced = c.invoices.reduce((s, i) => s + i.totalAmount, 0)
    if (billedFromLogs > totalInvoiced && billedFromLogs > 0) {
      badInvoiceClients++
    }
  }
  checks.push({
    label: "Clients with uninvoiced hours",
    status: badInvoiceClients > 0 ? "warn" : "ok",
    count: badInvoiceClients,
    detail: badInvoiceClients > 0 ? `${badInvoiceClients} clients have logged hours not yet invoiced` : "All hours are invoiced",
    href: "/dashboard/invoices",
  })

  // 2. Clients where expenses exceed invoicing (rate problem)
  const expenseClients = await prisma.client.findMany({
    include: {
      user: { select: { name: true } },
      invoices: { select: { totalAmount: true } },
      expenses: { select: { amount: true } },
    },
  })
  let rateIssueClients = 0
  for (const c of expenseClients) {
    const invoiced = c.invoices.reduce((s, i) => s + i.totalAmount, 0)
    const expenses = c.expenses.reduce((s, e) => s + e.amount, 0)
    if (expenses > invoiced && expenses > 0) {
      rateIssueClients++
    }
  }
  checks.push({
    label: "Clients with expenses > invoices (rate issue)",
    status: rateIssueClients > 0 ? "error" : "ok",
    count: rateIssueClients,
    detail: rateIssueClients > 0 ? `${rateIssueClients} clients have tutor costs exceeding billing — check rates` : "All clients profitable",
    href: "/dashboard/clients",
  })

  // 3. Projects without clients
  const orphanProjects = await prisma.project.count({ where: { clientId: null } })
  checks.push({
    label: "Projects without clients",
    status: orphanProjects > 0 ? "warn" : "ok",
    count: orphanProjects,
    detail: orphanProjects > 0 ? `${orphanProjects} projects are not linked to any client` : "All projects have clients",
    href: "/dashboard/projects?type=ALL",
  })

  // 4. Hour logs without expenses
  const logsWithoutExpenses = await prisma.hourLog.count({ where: { expense: null } })
  checks.push({
    label: "Hour logs without expense records",
    status: logsWithoutExpenses > 0 ? "warn" : "ok",
    count: logsWithoutExpenses,
    detail: logsWithoutExpenses > 0 ? `${logsWithoutExpenses} logs need expense sync — use Sync Historical Logs` : "All logs have expenses",
    href: "/dashboard/expenses-only",
  })

  // 5. Active contracts without rates
  const contractsNoRates = await prisma.contract.count({
    where: { status: "ACTIVE", rates: "{}" },
  })
  checks.push({
    label: "Active contracts without rates",
    status: contractsNoRates > 0 ? "error" : "ok",
    count: contractsNoRates,
    detail: contractsNoRates > 0 ? `${contractsNoRates} contracts have no rates configured` : "All active contracts have rates",
    href: "/dashboard/contracts",
  })

  // 6. Tutors without active contracts
  const tutorsNoContract = await prisma.tutor.count({
    where: { onboarded: true, contract: null },
  })
  checks.push({
    label: "Active tutors without a contract",
    status: tutorsNoContract > 0 ? "error" : "ok",
    count: tutorsNoContract,
    detail: tutorsNoContract > 0 ? `${tutorsNoContract} active tutors have no contract` : "All active tutors have contracts",
    href: "/dashboard/contracts",
  })

  const hasErrors = checks.some(c => c.status === "error")
  const hasWarnings = checks.some(c => c.status === "warn")

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Data Health</h2>
      <p className="text-sm text-zinc-500 mb-6">
        {hasErrors ? "Issues detected that need attention." : hasWarnings ? "Some items to review." : "Everything looks good."}
      </p>

      <div className="space-y-3">
        {checks.map(check => (
          <div key={check.label} className={`bg-white dark:bg-zinc-800 rounded-xl border p-4 flex items-center justify-between ${
            check.status === "error" ? "border-red-300 dark:border-red-700" :
            check.status === "warn" ? "border-amber-300 dark:border-amber-700" :
            "border-zinc-200 dark:border-zinc-700"
          }`}>
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                check.status === "error" ? "bg-red-500" : check.status === "warn" ? "bg-amber-500" : "bg-green-500"
              }`} />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{check.label}</p>
                <p className="text-xs text-zinc-500">{check.detail}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${
                check.status === "error" ? "text-red-600 dark:text-red-400" :
                check.status === "warn" ? "text-amber-600 dark:text-amber-400" :
                "text-green-600 dark:text-green-400"
              }`}>{check.count}</span>
              {check.href && (
                <Link href={check.href} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  View →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
