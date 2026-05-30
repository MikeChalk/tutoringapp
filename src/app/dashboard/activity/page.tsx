import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"

export default async function ActivityLogPage() {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
  })

  // Get user names in bulk
  const userIds = [...new Set(logs.map(l => l.userId))]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  })
  const userMap = new Map(users.map(u => [u.id, u.name]))

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Activity Log</h2>
      <p className="text-sm text-zinc-500 mb-6">Tracks changes across the platform. Latest 300 entries.</p>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
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
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="p-8 text-center text-sm text-zinc-500">No activity recorded yet.</div>
        )}
      </div>
    </div>
  )
}
