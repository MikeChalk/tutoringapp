"use client"

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    IN_PROGRESS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    ON_HOLD: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    FINISHED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    DRAFT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400",
    SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    ACCEPTED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    MATCHED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    NEW: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  }

  const labels: Record<string, string> = {
    IN_PROGRESS: "In Progress", ON_HOLD: "On Hold", FINISHED: "Finished", CANCELLED: "Cancelled",
  }

  return (
    <span className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${colors[status] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}>
      {labels[status] || status}
    </span>
  )
}

export function ModeBadge({ mode }: { mode: string }) {
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
      mode === "ONLINE" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
    }`}>
      {mode === "ONLINE" ? "Online" : "In Person"}
    </span>
  )
}

export function StatCard({ label, value, href, highlight, green }: {
  label: string; value: string | number; href: string; highlight?: boolean; green?: boolean
}) {
  return (
    <a href={href} className={`rounded-xl border p-6 transition-colors hover:border-zinc-400 dark:hover:border-zinc-500 ${
      highlight ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
      : green ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
      : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
    }`}>
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${
        highlight ? "text-amber-600 dark:text-amber-400"
        : green ? "text-green-600 dark:text-green-400"
        : "text-zinc-900 dark:text-zinc-100"
      }`}>{value}</p>
    </a>
  )
}
