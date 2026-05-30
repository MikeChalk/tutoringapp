import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, getTutorId, isClient, getClientId, isSuperAdmin, isCityAdmin, getActiveCityId } from "@/lib/auth-helpers"
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
  const cityAdminId = isCityAdmin(role) ? await getActiveCityId(role, session.user.id) : null
  const effectiveCityId = cityAdminId || (superAdmin && selectedCity !== "all" ? selectedCity : null)
  const cityFilter = effectiveCityId ? { cityId: effectiveCityId } : {}

  let stats = { tutorCount: 0, clientCount: 0, projectCount: 0, totalHours: 0, pendingInvoices: 0, newRequests: 0, totalEarned: 0, totalPaid: 0 }
  let contract: { type: string; yearLevel: string; endDate: Date; signed: boolean } | null = null
  let recentInvoices: Array<{ id: string; number: string; status: string; totalAmount: number; dueDate: Date }> = []
  let onboardingStep = 6

  if (tutor) {
    const tutorId = await getTutorId(session.user.id, session.user.email)
    if (tutorId) {
      const [tutorData] = await Promise.all([
        (async () => {
          const [tc, cc, pc, nc, ct, tt, hAgg] = await Promise.all([
            prisma.tutor.count({ where: { id: tutorId } }),
            prisma.client.count({ where: { projects: { some: { projectTutors: { some: { tutorId } } } } } }),
            prisma.project.count({ where: { projectTutors: { some: { tutorId } } } }),
            prisma.tutoringRequest.count({ where: { matchedTutorId: tutorId, status: "MATCHED" } }),
            prisma.contract.findFirst({ where: { tutorId, status: "ACTIVE" }, select: { type: true, yearLevel: true, endDate: true, signed: true } }),
            prisma.tutor.findUnique({ where: { id: tutorId }, select: { onboardingStep: true } }),
            prisma.hourLog.aggregate({ where: { tutorId }, _sum: { hours: true }, _count: true }),
          ])
          const logs = await prisma.hourLog.findMany({ where: { tutorId }, select: { hours: true, tutorPayRate: true, paidAt: true } })
          return {
            tc, cc, pc, nc, ct, onboardingStep: tt?.onboardingStep ?? 6,
            totalHours: logs.reduce((s, h) => s + h.hours, 0),
            totalEarned: logs.reduce((s, h) => s + h.hours * h.tutorPayRate, 0),
            totalPaid: logs.filter(h => h.paidAt).reduce((s, h) => s + h.hours * h.tutorPayRate, 0),
          }
        })(),
      ])
      stats = {
        tutorCount: tutorData.tc, clientCount: tutorData.cc, projectCount: tutorData.pc,
        totalHours: tutorData.totalHours, pendingInvoices: 0, newRequests: tutorData.nc,
        totalEarned: tutorData.totalEarned, totalPaid: tutorData.totalPaid,
      }
      contract = tutorData.ct
      onboardingStep = tutorData.onboardingStep
    }
  } else if (admin) {
    const [tc, cc, pc, outstandingInvoices, nr] = await Promise.all([
      prisma.tutor.count({ where: effectiveCityId ? { user: { cityId: effectiveCityId } } : {} }),
      prisma.client.count({ where: effectiveCityId ? { user: { cityId: effectiveCityId } } : {} }),
      prisma.project.count({ where: cityFilter }),
      prisma.invoice.aggregate({
        where: { status: { in: ["SENT", "OVERDUE"] }, ...(effectiveCityId ? { client: { user: { cityId: effectiveCityId } } } : {}) },
        _sum: { totalAmount: true },
      }),
      prisma.tutoringRequest.count({ where: { status: "NEW" } }),
    ])
    const hAgg = await prisma.hourLog.aggregate({ _sum: { hours: true } })
    stats = { tutorCount: tc, clientCount: cc, projectCount: pc, pendingInvoices: outstandingInvoices._sum.totalAmount || 0, newRequests: nr, totalHours: hAgg._sum.hours || 0, totalEarned: 0, totalPaid: 0 }
  } else if (client) {
    const clientId = await getClientId(session.user.id, session.user.email)
    if (clientId) {
      const [, pc, unpaidAgg] = await Promise.all([
        Promise.resolve(0),
        prisma.project.count({ where: { clientId } }),
        prisma.invoice.aggregate({ where: { clientId, status: { in: ["SENT", "OVERDUE"] } }, _sum: { totalAmount: true } }),
      ])
      recentInvoices = await prisma.invoice.findMany({
        where: { clientId },
        select: { id: true, number: true, status: true, totalAmount: true, dueDate: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
      stats = { tutorCount: 0, clientCount: 0, projectCount: pc, pendingInvoices: unpaidAgg._sum.totalAmount || 0, totalHours: 0, newRequests: 0, totalEarned: 0, totalPaid: 0 }
    }
  }

  const daysUntilExpiry = contract ? Math.ceil((new Date(contract.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Welcome, {session?.user?.name}</h2>
        {superAdmin && <CityFilter selected={selectedCity} />}
      </div>

      {tutor && onboardingStep < 6 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Onboarding in progress — Step {onboardingStep + 1} of 7
          </p>
          <Link href="/dashboard/contract" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block">
            View onboarding progress →
          </Link>
        </div>
      )}

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
              <span className="text-zinc-500">Expires: </span>
              <span className={`font-medium ${daysUntilExpiry < 30 ? "text-red-600 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                {new Date(contract.endDate).toLocaleDateString()}
                {daysUntilExpiry < 30 && daysUntilExpiry > 0 && <span className="ml-1 text-xs">({daysUntilExpiry}d)</span>}
              </span>
              <span className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${contract.signed ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                {contract.signed ? "Signed" : "Unsigned"}
              </span>
            </div>
          </div>
        </div>
      )}

      {client && recentInvoices.length > 0 && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Recent Invoices</p>
            <Link href="/dashboard/invoices" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {recentInvoices.map(inv => (
              <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`} className="flex items-center justify-between text-sm py-1 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 rounded px-2 -mx-2">
                <span className="text-zinc-900 dark:text-zinc-100">{inv.number}</span>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === "PAID" ? "bg-green-100 text-green-700" : inv.status === "SENT" ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-600"}`}>{inv.status}</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">${inv.totalAmount.toFixed(2)}</span>
                  <span className="text-xs text-zinc-400">Due {new Date(inv.dueDate).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {admin && <StatCard label="Tutors" value={stats.tutorCount} href="/dashboard/tutors" />}
        {!admin && !client && <StatCard label="My Students" value={stats.projectCount} href="/dashboard/projects" />}
        {(admin || tutor) && <StatCard label="Clients" value={stats.clientCount} href="/dashboard/clients" />}
        {client && <StatCard label="My Students" value={stats.projectCount} href="/dashboard/projects" />}
        {!client && <StatCard label="Total Hours" value={stats.totalHours} href="/dashboard/hours" />}
        {tutor && <StatCard label="Paid to Date" value={`$${stats.totalPaid.toFixed(0)}`} href="/dashboard/payments" green />}
        {tutor && stats.totalEarned > stats.totalPaid && <StatCard label="Unpaid" value={`$${(stats.totalEarned - stats.totalPaid).toFixed(0)}`} href="/dashboard/payments" highlight />}
        {admin && <StatCard label="Outstanding" value={`$${stats.pendingInvoices.toFixed(0)}`} href="/dashboard/invoices" highlight />}
        {client && <StatCard label="Unpaid Invoices" value={`$${stats.pendingInvoices.toFixed(0)}`} href="/dashboard/invoices" highlight />}
        {tutor && <StatCard label="New Offers" value={stats.newRequests} href="/dashboard/requests" highlight />}
        {admin && <StatCard label="New Requests" value={stats.newRequests} href="/dashboard/requests" highlight />}
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
