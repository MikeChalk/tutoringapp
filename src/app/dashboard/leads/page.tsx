import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/auth-helpers"
import Link from "next/link"

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "CONVERTED", label: "Converted" },
]

function buildHref(status: string, search: string, page: number) {
  const params = new URLSearchParams()
  if (status) params.set("status", status)
  if (search) params.set("search", search)
  if (page > 1) params.set("page", String(page))
  const qs = params.toString()
  return `/dashboard/leads${qs ? `?${qs}` : ""}`
}

export default async function LeadsPage(props: { searchParams: Promise<{ status?: string; search?: string; page?: string }> }) {
  await requireAdmin()

  const { status: statusParam, search: searchParam, page: pageParam } = await props.searchParams
  const selectedStatus = statusParam || ""
  const searchQuery = searchParam || ""
  const page = parseInt(pageParam || "1") || 1
  const pageSize = 50

  const where: Record<string, unknown> = {}
  if (selectedStatus) where.status = selectedStatus
  if (searchQuery) {
    where.OR = [
      { name: { contains: searchQuery } },
      { email: { contains: searchQuery } },
      { subject: { contains: searchQuery } },
    ]
  }

  const [leads, totalCount] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: { city: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lead.count({ where }),
  ])
  const totalPages = Math.ceil(totalCount / pageSize)

  const allLeads = await prisma.lead.findMany({ select: { status: true } })
  const newCount = allLeads.filter(l => l.status === "NEW").length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Leads</h2>
          <p className="text-sm text-zinc-500">{totalCount} total &middot; {newCount} new</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUS_TABS.map(tab => {
          const params = new URLSearchParams()
          if (tab.value) params.set("status", tab.value)
          if (searchQuery) params.set("search", searchQuery)
          return (
            <Link
              key={tab.value}
              href={`/dashboard/leads?${params.toString()}`}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                selectedStatus === tab.value
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600"
              }`}
            >
              {tab.label}
              {tab.value === "NEW" && newCount > 0 && <span className="ml-1 text-[10px] opacity-70">({newCount})</span>}
            </Link>
          )
        })}
      </div>

      <form action="/dashboard/leads" method="GET" className="mb-4 flex gap-2">
        {selectedStatus ? <input type="hidden" name="status" value={selectedStatus} /> : null}
        <input type="text" name="search" defaultValue={searchQuery} placeholder="Search by name, email, or subject..."
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Search</button>
        {searchQuery && <Link href={buildHref(selectedStatus, "", 1)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700">Clear</Link>}
      </form>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-200 dark:border-zinc-700"><th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Name</th><th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Email</th><th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Subject</th><th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">City</th><th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Status</th><th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Date</th><th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Action</th></tr></thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {leads.map(l => (
              <tr key={l.id} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{l.name}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{l.email}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{l.subject}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{l.city?.name || "-"}</td>
                <td className="px-4 py-3 text-center"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${l.status === "CONVERTED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : l.status === "CONTACTED" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>{l.status}</span></td>
                <td className="px-4 py-3 text-zinc-400">{new Date(l.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-center">
                  {l.status !== "CONVERTED" && (
                    <form action="/api/leads" method="POST" className="inline-flex gap-1">
                      <input type="hidden" name="leadId" value={l.id} />
                      {l.status === "NEW" && <button type="submit" name="_action" value="contacted" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Mark Contacted</button>}
                      <button type="submit" name="_action" value="convert" className="text-xs text-green-600 dark:text-green-400 hover:underline ml-2">Convert to Client</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">{searchQuery ? "No leads match your search." : selectedStatus ? `No ${selectedStatus.toLowerCase()} leads.` : "No leads yet."}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {page > 1 && (
            <Link href={buildHref(selectedStatus, searchQuery, page - 1)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Previous
            </Link>
          )}
          <span className="text-sm text-zinc-500 px-2">Page {page} of {totalPages} ({totalCount} total)</span>
          {page < totalPages && (
            <Link href={buildHref(selectedStatus, searchQuery, page + 1)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}