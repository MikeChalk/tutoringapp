import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function DiscountsPage(props: { searchParams: Promise<{ search?: string; page?: string }> }) {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const { search: searchParam, page: pageParam } = await props.searchParams
  const searchQuery = searchParam || ""
  const page = parseInt(pageParam || "1") || 1
  const pageSize = 50

  const where: Record<string, unknown> = {}
  if (searchQuery) {
    where.OR = [
      { code: { contains: searchQuery } },
      { description: { contains: searchQuery } },
    ]
  }

  const [codes, totalCount] = await Promise.all([
    prisma.discountCode.findMany({
      where,
      orderBy: { code: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.discountCode.count({ where }),
  ])
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Discount Codes</h2>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Create Code</h3>
        <form action="/api/discounts" method="POST" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div><label className="block text-xs text-zinc-500 mb-1">Code</label><input type="text" name="code" required placeholder="SUMMER25" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-zinc-500 mb-1">Description</label><input type="text" name="description" placeholder="Summer promotion" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-zinc-500 mb-1">Discount %</label><input type="number" name="discountPct" min="0" max="100" step="0.1" defaultValue="0" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-zinc-500 mb-1">or Flat $ Amount</label><input type="number" name="discountAmt" min="0" step="0.01" defaultValue="0" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-zinc-500 mb-1">Max Uses (0=unlimited)</label><input type="number" name="maxUses" min="0" defaultValue="0" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Create Code</button>
        </form>
        <p className="text-xs text-zinc-400 mt-3">Use either Discount % or Flat $ Amount — not both. Percentage takes priority.</p>
      </div>

      <form action="/dashboard/discounts" method="GET" className="mb-4 flex gap-2">
        <input type="text" name="search" defaultValue={searchQuery} placeholder="Search by code or description..."
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Search</button>
        {searchQuery && <Link href="/dashboard/discounts" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700">Clear</Link>}
      </form>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Code</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Description</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Discount</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Uses</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
              <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {codes.map(c => (
              <tr key={c.id} className={`text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50 ${!c.isActive ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 font-mono font-medium text-zinc-900 dark:text-zinc-100">{c.code}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{c.description || "-"}</td>
                <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-100">
                  {c.discountPct > 0 ? `${c.discountPct}%` : c.discountAmt > 0 ? `$${c.discountAmt.toFixed(2)}` : "-"}
                </td>
                <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">
                  {c.usedCount}{c.maxUses > 0 ? ` / ${c.maxUses}` : ""}
                  {c.maxUses > 0 && c.usedCount >= c.maxUses && (
                    <span className="text-red-500 text-xs ml-1">(limit reached)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <form action="/api/discounts" method="POST" className="inline">
                    <input type="hidden" name="_action" value="toggle" />
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {c.isActive ? "Active" : "Disabled"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <details className="relative">
                      <summary className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer list-none">Edit</summary>
                      <div className="absolute right-0 top-6 z-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 shadow-lg w-72">
                        <form action="/api/discounts" method="POST" className="space-y-3">
                          <input type="hidden" name="_action" value="edit" />
                          <input type="hidden" name="id" value={c.id} />
                          <div><label className="block text-xs text-zinc-500 mb-1">Description</label><input type="text" name="description" defaultValue={c.description} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                          <div className="grid grid-cols-2 gap-2">
                            <div><label className="block text-xs text-zinc-500 mb-1">Discount %</label><input type="number" name="discountPct" min="0" max="100" step="0.1" defaultValue={c.discountPct} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                            <div><label className="block text-xs text-zinc-500 mb-1">or Flat $</label><input type="number" name="discountAmt" min="0" step="0.01" defaultValue={c.discountAmt} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                          </div>
                          <div><label className="block text-xs text-zinc-500 mb-1">Max Uses</label><input type="number" name="maxUses" min="0" defaultValue={c.maxUses} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                          <button type="submit" className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors">Save Changes</button>
                        </form>
                      </div>
                    </details>
                    <form action="/api/discounts" method="POST" className="inline">
                      <input type="hidden" name="_action" value="delete" />
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="text-xs text-red-600 dark:text-red-400 hover:underline">Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {codes.length === 0 && (
          <div className="p-8 text-center text-sm text-zinc-500">{searchQuery ? "No discount codes match your search." : "No discount codes yet. Create one above."}</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {page > 1 && (
            <Link href={`/dashboard/discounts?page=${page - 1}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Previous
            </Link>
          )}
          <span className="text-sm text-zinc-500 px-2">Page {page} of {totalPages} ({totalCount} total)</span>
          {page < totalPages && (
            <Link href={`/dashboard/discounts?page=${page + 1}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}