import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/auth-helpers"
import Link from "next/link"

const ENTITY_FILTERS = [
  { value: "", label: "All" },
  { value: "Invoice", label: "Invoices" },
  { value: "HourLog", label: "Hour Logs" },
  { value: "Expense", label: "Expenses" },
  { value: "Project", label: "Projects" },
]

export default async function ActivityLogPage(props: { searchParams: Promise<{ entity?: string; user?: string; from?: string; to?: string; search?: string; page?: string }> }) {
  await requireAdmin()

  const { entity: entityFilter, user: userFilter, from: fromDate, to: toDate, search: searchParam, page: pageParam } = await props.searchParams
  const searchQuery = searchParam || ""
  const page = parseInt(pageParam || "1") || 1
  const pageSize = 50

  const where: Record<string, unknown> = {}
  if (entityFilter) where.entity = entityFilter
  if (userFilter) where.userId = userFilter
  if (fromDate || toDate) {
    const createdAt: Record<string, Date> = {}
    if (fromDate) createdAt.gte = new Date(fromDate)
    if (toDate) createdAt.lte = new Date(toDate + "T23:59:59")
    where.createdAt = createdAt
  }
  if (searchQuery) {
    where.OR = [
      { action: { contains: searchQuery } },
      { details: { contains: searchQuery } },
      { entity: { contains: searchQuery } },
    ]
  }

  const [logs, totalCount] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.activityLog.count({ where }),
  ])
  const totalPages = Math.ceil(totalCount / pageSize)

  const userIds = [...new Set(logs.map(l => l.userId))]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  })
  const userMap = new Map(users.map(u => [u.id, u.name]))

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Activity Log</h2>
      <p className="text-sm text-zinc-500 mb-4">Track changes across the platform.</p>

      <form action="/dashboard/activity" method="GET" className="mb-4 flex flex-wrap gap-3 items-end bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Entity</label>
          <select name="entity" className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm">
            {ENTITY_FILTERS.map(f => <option key={f.value} value={f.value} selected={entityFilter === f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">From</label>
          <input type="date" name="from" defaultValue={fromDate || ""} className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">To</label>
          <input type="date" name="to" defaultValue={toDate || ""} className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm" />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-zinc-500 mb-1">Search</label>
          <input type="text" name="search" defaultValue={searchQuery} placeholder="Search action, details, or entity..." className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm" />
        </div>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Filter</button>
        {(entityFilter || fromDate || toDate || searchQuery) && <Link href="/dashboard/activity" className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100">Clear</Link>}
      </form>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">When</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Action</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Entity</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {logs.map((l) => (
              <tr key={l.id} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap text-xs">
                  {new Date(l.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                  {new Date(l.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-2.5 text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                  {userMap.get(l.userId) || l.userId.slice(0, 8)}
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                    {l.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                  {l.entity}{l.entityId ? ` #${l.entityId.slice(0, 8)}` : ""}
                </td>
                <td className="px-4 py-2.5 text-zinc-500 max-w-xs truncate text-xs">
                  {l.details || "-"}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">No activity recorded yet.</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {page > 1 && (
            <Link href={`/dashboard/activity?page=${page - 1}${entityFilter ? `&entity=${entityFilter}` : ""}${fromDate ? `&from=${fromDate}` : ""}${toDate ? `&to=${toDate}` : ""}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Previous
            </Link>
          )}
          <span className="text-sm text-zinc-500 px-2">Page {page} of {totalPages} ({totalCount} total)</span>
          {page < totalPages && (
            <Link href={`/dashboard/activity?page=${page + 1}${entityFilter ? `&entity=${entityFilter}` : ""}${fromDate ? `&from=${fromDate}` : ""}${toDate ? `&to=${toDate}` : ""}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}