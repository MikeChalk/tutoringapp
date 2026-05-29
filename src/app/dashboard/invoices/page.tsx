import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, isClient, getClientId, isSuperAdmin, isCityAdmin, getActiveCityId } from "@/lib/auth-helpers"
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
  const cityAdminId = isCityAdmin(session.user.role) ? await getActiveCityId(session.user.role, session.user.id) : null
  const effectiveCityId = cityAdminId || (isSuperAdmin(session.user.role) && selectedCity !== "all" ? selectedCity : null)

  let whereClause: Record<string, unknown> = {}
  if (client) {
    const clientId = await getClientId(session.user.id, session.user.email)
    if (clientId) { whereClause = { clientId } }
  }

  if (effectiveCityId) {
    whereClause = { ...whereClause, client: { user: { cityId: effectiveCityId } } }
  }

  const invoices = await prisma.invoice.findMany({
    where: whereClause,
    include: {
      client: { include: { user: { select: { name: true, city: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  const clients = admin ? await prisma.client.findMany({
    where: effectiveCityId ? { user: { cityId: effectiveCityId } } : {},
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  }) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Invoices</h2>
        {isSuperAdmin(session.user.role) && <CityFilter selected={selectedCity} />}
      </div>

      {admin && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Create Invoice</h3>
          <form action="/api/invoices" method="POST" className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Client</label>
              <select name="clientId" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select client</option>
                {clients.map(c => (<option key={c.id} value={c.id}>{c.user.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Description</label>
              <input type="text" name="description" required placeholder="e.g. Tutoring — May 2026" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Amount ($)</label>
              <input type="number" name="amount" min="0" step="0.01" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Date</label>
              <input type="date" name="date" defaultValue={new Date().toISOString().split("T")[0]} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Due Date</label>
              <input type="date" name="dueDate" defaultValue={new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0]} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Create Invoice</button>
          </form>
        </div>
      )}

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
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">City</th>
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
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {invoice.client.user.city?.name || "-"}
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
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-500">
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
