import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, getTutorId, isClient, getClientId, isSuperAdmin } from "@/lib/auth-helpers"
import { CONTRACT_TYPE_LABELS, TENURE_LABELS } from "@/lib/constants"
import { CityFilter } from "@/components/city-filter"
import Link from "next/link"

export default async function DashboardPage(props: { searchParams: Promise<{ city?: string }> }) {
  const session = await requireAuth()
  const role = session.user.role
  const admin = isAdmin(role)
  const tutor = isTutor(role)
  const client = isClient(role)
  const superAdmin = isSuperAdmin(role)

  const { city: cityParam } = await props.searchParams
  const selectedCity = cityParam || "all"

  const cityFilter = superAdmin && selectedCity !== "all" ? { cityId: selectedCity } : {}

  let tutorCount = 0
  let clientCount = 0
  let projectCount = 0
  let totalHours = 0
  let pendingInvoices = 0
  let newRequests = 0
  let totalEarned = 0
  let contract: {
    type: string; yearLevel: string; endDate: Date; signed: boolean
  } | null = null

  if (tutor) {
    const tutorId = await getTutorId(session.user.id, session.user.email)
    if (tutorId) {
      [tutorCount, clientCount, projectCount, pendingInvoices, newRequests, contract] =
        await Promise.all([
          prisma.tutor.count({ where: { id: tutorId } }),
          prisma.client.count({ where: { projects: { some: { projectTutors: { some: { tutorId } } } } } }),
          prisma.project.count({ where: { projectTutors: { some: { tutorId } } } }),
          Promise.resolve(0),
          prisma.tutoringRequest.count({ where: { matchedTutorId: tutorId, status: "NEW" } }),
          prisma.contract.findFirst({
            where: { tutorId, status: "ACTIVE" },
            select: { type: true, yearLevel: true, endDate: true, signed: true },
          }),
        ])
      const logs = await prisma.hourLog.findMany({ where: { tutorId }, select: { hours: true, tutorPayRate: true } })
      totalHours = logs.reduce((s, h) => s + h.hours, 0)
      totalEarned = logs.reduce((s, h) => s + h.hours * h.tutorPayRate, 0)
    }
  } else if (admin) {
    [tutorCount, clientCount, projectCount, pendingInvoices, newRequests] =
      await Promise.all([
        prisma.tutor.count({ where: superAdmin && selectedCity !== "all" ? { user: { cityId: selectedCity } } : {} }),
        prisma.client.count({ where: superAdmin && selectedCity !== "all" ? { user: { cityId: selectedCity } } : {} }),
        prisma.project.count({ where: cityFilter }),
        prisma.invoice.count({ where: { status: "DRAFT", ...(superAdmin && selectedCity !== "all" ? { client: { user: { cityId: selectedCity } } } : {}) } }),
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

  const daysUntilExpiry = contract
    ? Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Welcome, {session?.user?.name}
        </h2>
        {superAdmin && <CityFilter selected={selectedCity} />}
      </div>

      {tutor && contract && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Your Contract</p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {CONTRACT_TYPE_LABELS[contract.type]} &middot; {TENURE_LABELS[contract.yearLevel]}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Expires: </span>
                <span className={`font-medium ${daysUntilExpiry < 30 ? "text-red-600 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                  {new Date(contract.endDate).toLocaleDateString()}
                  {daysUntilExpiry < 30 && daysUntilExpiry > 0 && (
                    <span className="ml-1 text-xs">({daysUntilExpiry}d)</span>
                  )}
                </span>
              </div>
              <span className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${
                contract.signed ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}>
                {contract.signed ? "Signed" : "Unsigned"}
              </span>
            </div>
          </div>
          {daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400">
              Your contract expires soon. Contact your admin to renew.
            </p>
          )}
          {daysUntilExpiry <= 0 && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400 font-medium">
              Your contract has expired. Contact your admin to renew.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {admin && <StatCard label="Tutors" value={tutorCount} href="/dashboard/tutors" />}
        <StatCard label="Clients" value={clientCount} href="/dashboard/clients" />
        <StatCard label="Students" value={projectCount} href="/dashboard/projects" />
        <StatCard label="Total Hours" value={totalHours} href="/dashboard/hours" />
        {tutor && <StatCard label="Total Earned" value={`$${totalEarned.toFixed(0)}`} href="/dashboard/payments" green />}
        {!tutor && <StatCard label="Draft Invoices" value={pendingInvoices} href="/dashboard/invoices" highlight />}
        <StatCard label={tutor ? "Offers" : "New Requests"} value={newRequests} href="/dashboard/requests" highlight />
      </div>
    </div>
  )
}

function StatCard({ label, value, href, highlight, green }: {
  label: string; value: string | number; href: string; highlight?: boolean; green?: boolean
}) {
  return (
    <Link href={href}
      className={`rounded-xl border p-6 transition-colors hover:border-zinc-400 dark:hover:border-zinc-500 ${
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
    </Link>
  )
}
