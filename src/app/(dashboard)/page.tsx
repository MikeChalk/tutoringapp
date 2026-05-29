import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()

  const [tutorCount, clientCount, projectCount, pendingHours, pendingInvoices, newRequests] =
    await Promise.all([
      prisma.tutor.count(),
      prisma.client.count(),
      prisma.project.count(),
      prisma.hourLog.count({ where: { status: "PENDING" } }),
      prisma.invoice.count({ where: { status: "DRAFT" } }),
      prisma.tutoringRequest.count({ where: { status: "NEW" } }),
    ])

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
        Welcome, {session?.user?.name}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Tutors" value={tutorCount} href="/dashboard/tutors" />
        <StatCard label="Clients" value={clientCount} href="/dashboard/clients" />
        <StatCard label="Projects" value={projectCount} href="/dashboard/projects" />
        <StatCard label="Pending Hours" value={pendingHours} href="/dashboard/hours" highlight />
        <StatCard label="Draft Invoices" value={pendingInvoices} href="/dashboard/invoices" highlight />
        <StatCard label="New Requests" value={newRequests} href="/dashboard/requests" highlight />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string
  value: number
  href: string
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border p-6 transition-colors hover:border-zinc-400 dark:hover:border-zinc-500 ${
        highlight
          ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
          : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
      }`}
    >
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${highlight ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100"}`}>
        {value}
      </p>
    </Link>
  )
}
