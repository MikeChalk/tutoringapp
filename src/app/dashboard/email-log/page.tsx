import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"

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

export default async function EmailLogPage() {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const logs = await prisma.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Email Log</h2>
      <p className="text-sm text-zinc-500 mb-6">Every email sent through the platform. Latest 200 entries.</p>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
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
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="p-8 text-center text-sm text-zinc-500">No emails sent yet.</div>
        )}
      </div>
    </div>
  )
}
