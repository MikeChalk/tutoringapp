import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, isClient, getClientId, isSuperAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { CityFilter } from "@/components/city-filter"
import Link from "next/link"

export default async function InvoicesPage(props: { searchParams: Promise<{ city?: string }> }) {
  const session = await requireAuth()
  const admin = isAdmin(session.user.role)
  const tutor = isTutor(session.user.role)
  const client = isClient(session.user.role)

  if (tutor) redirect("/dashboard")

  const { city: cityParam } = await props.searchParams
  const selectedCity = cityParam || "all"

  let whereClause: Record<string, unknown> = {}
  if (client) {
    const clientId = await getClientId(session.user.id, session.user.email)
    if (clientId) { whereClause = { clientId } }
  }

  if (isSuperAdmin(session.user.role) && selectedCity !== "all") {
    whereClause = { ...whereClause, client: { user: { cityId: selectedCity } } }
  }

  const invoices = await prisma.invoice.findMany({
    where: whereClause,
    include: {
      client: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Invoices</h2>
        {isSuperAdmin(session.user.role) && <CityFilter selected={selectedCity} />}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total Outstanding"
          value={`$${invoices
            .filter((i) => i.status === "SENT" || i.status === "OVERDUE")
            .reduce((sum, i) => sum + i.totalAmount, 0)
            .toFixed(2)}`}
        />
        <StatCard
          label="Paid This Month"
          value={`$${invoices
            .filter(
              (i) =>
                i.status === "PAID" &&
                i.paidAt &&
                new Date(i.paidAt).getMonth() === new Date().getMonth()
            )
            .reduce((sum, i) => sum + i.totalAmount, 0)
            .toFixed(2)}`}
        />
        <StatCard label="Total Invoices" value={invoices.length.toString()} />
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Number</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Client</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/invoices/${invoice.id}`}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {invoice.number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {invoice.client.user.name}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                  ${invoice.totalAmount.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${
                      invoice.status === "PAID"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : invoice.status === "SENT"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : invoice.status === "DRAFT"
                        ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {invoice.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
      <p className="text-xs text-zinc-500 uppercase">{label}</p>
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  )
}
