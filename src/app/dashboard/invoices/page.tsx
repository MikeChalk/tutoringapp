import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, isClient, getClientId, isSuperAdmin, isCityAdmin, getActiveCityId } from "@/lib/auth-helpers"
import { INVOICE_STATUS_COLORS } from "@/lib/constants"
import { redirect } from "next/navigation"
import { CityFilter } from "@/components/city-filter"
import { CreateInvoiceForm } from "@/components/create-invoice-form"
import { EmptyState } from "@/components/empty-state"
import { Receipt } from "lucide-react"
import { StatCard } from "@/components/ui"
import Link from "next/link"

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Drafts" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
]

export default async function InvoicesPage(props: { searchParams: Promise<{ city?: string; status?: string; search?: string; page?: string; generated?: string; reminded?: string }> }) {
  const session = await requireAuth()
  const admin = isAdmin(session.user.role)
  const tutor = isTutor(session.user.role)
  const client = isClient(session.user.role)

  if (tutor) redirect("/dashboard")

  const { city: cityParam, status: statusParam, search: searchParam, page: pageParam, generated: generatedParam, reminded: remindedParam } = await props.searchParams
  const selectedCity = cityParam || "all"
  const selectedStatus = statusParam || ""
  const searchQuery = searchParam || ""
  const page = parseInt(pageParam || "1") || 1
  const pageSize = 50
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

  if (selectedStatus) {
    whereClause = { ...whereClause, status: selectedStatus }
  }

  if (searchQuery) {
    whereClause = {
      ...whereClause,
      OR: [
        { number: { contains: searchQuery } },
        { client: { user: { name: { contains: searchQuery } } } },
      ],
    }
  }

  const [invoices, totalCount] = await Promise.all([
    prisma.invoice.findMany({
      where: whereClause,
      include: {
        client: { include: { user: { select: { name: true, city: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where: whereClause }),
  ])

  const totalPages = Math.ceil(totalCount / pageSize)

  // Always fetch all invoices for stats (not just current page)
  const statsWhere: Record<string, unknown> = {}
  if (client) {
    const clientId = await getClientId(session.user.id, session.user.email)
    if (clientId) statsWhere.clientId = clientId
  }
  if (effectiveCityId) {
    statsWhere.client = { user: { cityId: effectiveCityId } }
  }
  const allForStats = await prisma.invoice.findMany({
    where: statsWhere,
    select: { status: true, totalAmount: true, paidAt: true },
  })

  const draftCount = allForStats.filter(i => i.status === "DRAFT").length
  const draftTotal = allForStats.filter(i => i.status === "DRAFT").reduce((sum, i) => sum + i.totalAmount, 0)

  const clients = admin ? await prisma.client.findMany({
    where: effectiveCityId ? { user: { cityId: effectiveCityId } } : {},
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  }) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Invoices</h2>
        <div className="flex items-center gap-3">
          {admin && (
            <>
              <form action="/api/cron?action=generate" method="POST" data-confirm="Generate invoices for all clients with unbilled hours?">
                <button type="submit" className="text-xs text-green-600 dark:text-green-400 hover:underline">Generate Invoices</button>
              </form>
              <form action="/api/cron?action=remind" method="POST" data-confirm="Send payment reminders to all overdue clients?">
                <button type="submit" className="text-xs text-amber-600 dark:text-amber-400 hover:underline">Send Reminders</button>
              </form>
              <a href="/api/export?type=invoices" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Export CSV</a>
              <a href="/api/export?type=accounting" className="text-xs text-purple-600 dark:text-purple-400 hover:underline">Accounting Export</a>
            </>
          )}
          {isSuperAdmin(session.user.role) && <CityFilter selected={selectedCity} />}
        </div>
      </div>

      {admin && (
        <form action="/dashboard/invoices" method="GET" className="mb-4 flex gap-2">
          {selectedStatus ? <input type="hidden" name="status" value={selectedStatus} /> : null}
          {selectedCity !== "all" ? <input type="hidden" name="city" value={selectedCity} /> : null}
          <input type="text" name="search" defaultValue={searchQuery} placeholder="Search by client name or invoice number..."
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Search</button>
          {searchQuery && <Link href={`/dashboard/invoices${selectedStatus ? `?status=${selectedStatus}` : ""}${selectedCity !== "all" ? `${selectedStatus ? "&" : "?"}city=${selectedCity}` : ""}`} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-100">Clear</Link>}
        </form>
      )}

      {(generatedParam || remindedParam) && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-3 text-sm text-green-700 dark:text-green-300">
          {generatedParam && `Generated ${generatedParam} invoice${generatedParam === "1" ? "" : "s"}.`}
          {remindedParam && `Sent ${remindedParam} reminder${remindedParam === "1" ? "" : "s"}.`}
        </div>
      )}

      {admin && <CreateInvoiceForm clients={clients} />}

      {/* Status tabs */}
      <div className="flex gap-2 mb-4">
        {STATUS_TABS.map(tab => (
          <Link
            key={tab.value}
            href={`/dashboard/invoices${tab.value ? `?status=${tab.value}` : ""}${selectedCity !== "all" ? `${tab.value ? "&" : "?"}city=${selectedCity}` : ""}`}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              selectedStatus === tab.value
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600"
            }`}
          >
            {tab.label}
            {tab.value === "DRAFT" && draftCount > 0 && (
              <span className="ml-1 text-[10px] opacity-70">({draftCount})</span>
            )}
          </Link>
        ))}
      </div>

      {/* Bulk send drafts button */}
      {(selectedStatus === "DRAFT" || !selectedStatus) && draftCount > 0 && admin && (
        <div className="mb-4">
          <form action="/api/invoices/send-all" method="POST" className="inline" data-confirm="Send ALL draft invoices to clients?">
            <button type="submit" className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              Send All Drafts ({draftCount})
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          label={selectedStatus ? `${selectedStatus} Total` : "Total Outstanding"}
          value={`$${allForStats
            .filter((i) => selectedStatus ? i.status === selectedStatus : (i.status === "SENT" || i.status === "OVERDUE"))
            .reduce((sum, i) => sum + i.totalAmount, 0)
            .toFixed(2)}`}
        />
        <StatCard
          label="Paid This Month"
          value={`$${allForStats
            .filter(
              (i) =>
                i.status === "PAID" &&
                i.paidAt &&
                new Date(i.paidAt).getMonth() === new Date().getMonth() &&
                new Date(i.paidAt).getFullYear() === new Date().getFullYear()
            )
            .reduce((sum, i) => sum + i.totalAmount, 0)
            .toFixed(2)}`}
        />
        <StatCard label={selectedStatus ? "All Invoices" : "Draft Total"} value={selectedStatus ? allForStats.length.toString() : `$${draftTotal.toFixed(2)}`} />
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Number</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Client</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">City</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Created</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Due</th>
              {admin && <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Actions</th>}
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
                    className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${INVOICE_STATUS_COLORS[invoice.status] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}
                  >
                    {invoice.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-500 whitespace-nowrap">
                  {new Date(invoice.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </td>
                {admin && (
                  <td className="px-4 py-3 text-center">
                    {invoice.status === "DRAFT" && (
                      <form action={`/api/invoices/${invoice.id}`} method="POST" className="inline">
                        <input type="hidden" name="_action" value="markSent" />
                        <input type="hidden" name="redirectTo" value={`/dashboard/invoices${selectedStatus ? `?status=${selectedStatus}` : ""}`} />
                        <button type="submit" className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                          Send
                        </button>
                      </form>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={admin ? 8 : 7} className="px-4 py-8">
                  <EmptyState
                    icon={Receipt}
                    title={selectedStatus ? `No ${selectedStatus.toLowerCase()} invoices` : "No invoices yet"}
                    description="Create an invoice or generate one from unbilled hours."
                    action={admin ? { label: "Create Invoice", href: "#create-invoice" } : undefined}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {page > 1 && (
            <Link href={`/dashboard/invoices?page=${page - 1}${selectedStatus ? `&status=${selectedStatus}` : ""}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}${selectedCity !== "all" ? `&city=${selectedCity}` : ""}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700">
              Previous
            </Link>
          )}
          <span className="text-sm text-zinc-500">Page {page} of {totalPages} ({totalCount} total)</span>
          {page < totalPages && (
            <Link href={`/dashboard/invoices?page=${page + 1}${selectedStatus ? `&status=${selectedStatus}` : ""}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}${selectedCity !== "all" ? `&city=${selectedCity}` : ""}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}


