import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/auth-helpers"
import Link from "next/link"

const TRIGGER_LABELS: Record<string, string> = {
  career_application: "Career Application",
  onboarding_welcome: "Onboarding Welcome",
  contract_signed: "Contract Signed",
  parent_tutor_match: "Parent / Tutor Match",
  client_invite: "Client Invite",
  payment_received: "Payment Received",
  invoice_reminder: "Invoice Reminder",
  bulk_email: "Mass Email",
}

const TRIGGER_COLORS: Record<string, string> = {
  career_application: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  onboarding_welcome: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contract_signed: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  parent_tutor_match: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  client_invite: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  payment_received: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  invoice_reminder: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  bulk_email: "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
}

export default async function EmailLogPage(props: { searchParams: Promise<{ search?: string; page?: string }> }) {
  await requireAdmin()

  const { search: searchParam, page: pageParam } = await props.searchParams
  const searchQuery = searchParam || ""
  const page = parseInt(pageParam || "1") || 1
  const pageSize = 50

  const where: Record<string, unknown> = {}
  if (searchQuery) {
    where.OR = [
      { to: { contains: searchQuery } },
      { subject: { contains: searchQuery } },
      { trigger: { contains: searchQuery } },
    ]
  }

  const [logs, totalCount] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.emailLog.count({ where }),
  ])
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Email Log</h2>
      <p className="text-sm text-zinc-500 mb-4">Every email sent through the platform.</p>

      <form action="/dashboard/email-log" method="GET" className="mb-4 flex gap-2">
        <input type="text" name="search" defaultValue={searchQuery} placeholder="Search by recipient, subject, or type..."
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Search</button>
        {searchQuery && <Link href="/dashboard/email-log" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700">Clear</Link>}
      </form>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">To</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Subject</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {logs.map((l) => (
              <tr key={l.id} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                  {new Date(l.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                  {l.to}
                </td>
                <td className="px-4 py-2.5 text-zinc-900 dark:text-zinc-100 max-w-xs truncate">
                  {l.subject}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TRIGGER_COLORS[l.trigger] || "bg-zinc-100 text-zinc-600"}`}>
                    {TRIGGER_LABELS[l.trigger] || l.trigger}
                  </span>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-500">{searchQuery ? "No emails match your search." : "No emails sent yet."}</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {page > 1 && (
            <Link href={`/dashboard/email-log?page=${page - 1}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Previous
            </Link>
          )}
          <span className="text-sm text-zinc-500 px-2">Page {page} of {totalPages} ({totalCount} total)</span>
          {page < totalPages && (
            <Link href={`/dashboard/email-log?page=${page + 1}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}