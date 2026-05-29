import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"

export default async function DiscountsPage() {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const codes = await prisma.discountCode.findMany({ orderBy: { code: "asc" } })

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Discount Codes</h2>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Create Code</h3>
        <form action="/api/discounts" method="POST" className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div><label className="block text-xs text-zinc-500 mb-1">Code</label><input type="text" name="code" required placeholder="SUMMER25" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-zinc-500 mb-1">Description</label><input type="text" name="description" placeholder="Summer promotion" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-zinc-500 mb-1">Discount %</label><input type="number" name="discountPct" min="0" max="100" defaultValue="0" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-zinc-500 mb-1">Max Uses (0=unlimited)</label><input type="number" name="maxUses" min="0" defaultValue="0" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Create Code</button>
        </form>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-200 dark:border-zinc-700"><th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Code</th><th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Description</th><th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Discount</th><th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Uses</th><th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Actions</th></tr></thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {codes.map(c => (
              <tr key={c.id} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                <td className="px-4 py-3 font-mono font-medium text-zinc-900 dark:text-zinc-100">{c.code}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{c.description || "-"}</td>
                <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-100">{c.discountPct > 0 ? `${c.discountPct}%` : `$${c.discountAmt.toFixed(2)}`}</td>
                <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">{c.usedCount}{c.maxUses > 0 ? `/${c.maxUses}` : ""}</td>
                <td className="px-4 py-3 text-center">
                  <form action="/api/discounts" method="POST"><input type="hidden" name="_action" value="delete" /><input type="hidden" name="id" value={c.id} /><button type="submit" className="text-xs text-red-600 dark:text-red-400 hover:underline">Delete</button></form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
