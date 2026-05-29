import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, getTutorId, isClient, getClientId } from "@/lib/auth-helpers"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await requireAuth()
  const role = session.user.role
  const admin = isAdmin(role)
  const tutor = isTutor(role)
  const client = isClient(role)

  let tutorCount = 0
  let clientCount = 0
  let projectCount = 0
  let totalHours = 0
  let pendingInvoices = 0
  let newRequests = 0

  if (tutor) {
    const tutorId = await getTutorId(session.user.id, session.user.email)
    if (tutorId) {
      [tutorCount, clientCount, projectCount, pendingInvoices, newRequests] =
        await Promise.all([
          prisma.tutor.count({ where: { id: tutorId } }),
          prisma.client.count({ where: { projects: { some: { projectTutors: { some: { tutorId } } } } } }),
          prisma.project.count({ where: { projectTutors: { some: { tutorId } } } }),
          Promise.resolve(0),
          prisma.tutoringRequest.count({ where: { matchedTutorId: tutorId, status: "NEW" } }),
        ])
      const logs = await prisma.hourLog.findMany({ where: { tutorId }, select: { hours: true } })
      totalHours = logs.reduce((s, h) => s + h.hours, 0)
    }
  } else if (admin) {
    [tutorCount, clientCount, projectCount, pendingInvoices, newRequests] =
      await Promise.all([
        prisma.tutor.count(),
        prisma.client.count(),
        prisma.project.count(),
        prisma.invoice.count({ where: { status: "DRAFT" } }),
        prisma.tutoringRequest.count({ where: { status: "NEW" } }),
      ])
    const logs = await prisma.hourLog.findMany({ select: { hours: true } })
    totalHours = logs.reduce((s, h) => s + h.hours, 0)
  } else if (client) {
    const clientId = await getClientId(session.user.id, session.user.email)
    if (clientId) {
      [tutorCount, clientCount, projectCount, pendingInvoices, newRequests] =
        await Promise.all([
          Promise.resolve(0),
          prisma.client.count({ where: { id: clientId } }),
          prisma.project.count({ where: { clientId } }),
          prisma.invoice.count({ where: { clientId, status: "DRAFT" } }),
          Promise.resolve(0),
        ])
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
        Welcome, {session?.user?.name}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {admin && <StatCard label="Tutors" value={tutorCount} href="/dashboard/tutors" />}
        <StatCard label="Clients" value={clientCount} href="/dashboard/clients" />
        <StatCard label="Students" value={projectCount} href="/dashboard/projects" />
        <StatCard label="Total Hours" value={totalHours} href="/dashboard/hours" />
        {!tutor && <StatCard label="Draft Invoices" value={pendingInvoices} href="/dashboard/invoices" highlight />}
        <StatCard label={tutor ? "Offers" : "New Requests"} value={newRequests} href="/dashboard/requests" highlight />
      </div>
    </div>
  )
}

function StatCard({ label, value, href, highlight }: { label: string; value: number; href: string; highlight?: boolean }) {
  return (
    <Link href={href} className={`rounded-xl border p-6 transition-colors hover:border-zinc-400 dark:hover:border-zinc-500 ${highlight ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20" : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"}`}>
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${highlight ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100"}`}>{value}</p>
    </Link>
  )
}
