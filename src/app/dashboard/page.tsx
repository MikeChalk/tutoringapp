import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, isClient, getClientId, getTutorId, isSuperAdmin, getCityAccessScope } from "@/lib/auth-helpers"
import { NoCityAccess } from "@/components/no-city-access"
import { CONTRACT_TYPE_LABELS, TENURE_LABELS } from "@/lib/constants"
import { CityFilter } from "@/components/city-filter"
import { StatCard } from "@/components/ui"
import TutorDashboard from "@/app/dashboard/tutor-dashboard"
import ClientWelcome from "@/components/client-welcome"
import ClientDashboardContent from "@/components/client-dashboard-content"
import { computeClientGreeting, getMontrealNow, getMontrealInfo, getMontrealTodayStr } from "@/lib/greeting"
import { cookies } from "next/headers"
import Link from "next/link"

export default async function DashboardPage(props: { searchParams: Promise<{ city?: string }> }) {
  const session = await requireAuth()
  const role = session.user.role
  const admin = isAdmin(role)
  const tutor = isTutor(role)
  const client = isClient(role)
  const superAdmin = isSuperAdmin(role)

  if (tutor) {
    return <TutorDashboard />
  }

  const { city: cityParam } = await props.searchParams
  const selectedCity = cityParam || "all"
  const scope = await getCityAccessScope(role, session.user.id)
  if (scope.kind === "none") return <NoCityAccess />
  const cityAdminId = scope.kind === "single" ? scope.cityId : null
  const effectiveCityId = cityAdminId || (superAdmin && selectedCity !== "all" ? selectedCity : null)
  const cityFilter = effectiveCityId ? { cityId: effectiveCityId } : {}

  let stats = { tutorCount: 0, clientCount: 0, projectCount: 0, totalHours: 0, pendingInvoices: 0, newRequests: 0, totalEarned: 0, totalPaid: 0 }
  let contract: { type: string; yearLevel: string; endDate: Date; signed: boolean } | null = null
  let recentInvoices: Array<{ id: string; number: string; status: string; totalAmount: number; dueDate: Date }> = []
  let onboardingStep = 7

  if (tutor) {
    const tutorId = await getTutorId(session.user.id, session.user.email)
    if (tutorId) {
      const [tutorData] = await Promise.all([
        (async () => {
          const [tc, cc, pc, nc, ct, tt] = await Promise.all([
            prisma.tutor.count({ where: { id: tutorId } }),
            prisma.client.count({ where: { projects: { some: { projectTutors: { some: { tutorId } } } } } }),
            prisma.project.count({ where: { projectTutors: { some: { tutorId } } } }),
            prisma.tutoringRequest.count({ where: { matchedTutorId: tutorId, status: "MATCHED" } }),
            prisma.contract.findFirst({ where: { tutorId, status: "ACTIVE" }, select: { type: true, yearLevel: true, endDate: true, signed: true } }),
            prisma.tutor.findUnique({ where: { id: tutorId }, select: { onboardingStep: true } }),
          ])
          const logs = await prisma.hourLog.findMany({ where: { tutorId }, select: { hours: true, tutorPayRate: true, paidAt: true } })
          return {
            tc, cc, pc, nc, ct, onboardingStep: tt?.onboardingStep ?? 7,
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
      prisma.tutoringRequest.count({ where: { status: "NEW", ...(effectiveCityId ? { cityId: effectiveCityId } : {}) } }),
    ])
    const hAgg = await prisma.hourLog.aggregate({ where: effectiveCityId ? { project: { cityId: effectiveCityId } } : {}, _sum: { hours: true } })
    stats = { tutorCount: tc, clientCount: cc, projectCount: pc, pendingInvoices: outstandingInvoices._sum.totalAmount || 0, newRequests: nr, totalHours: hAgg._sum.hours || 0, totalEarned: 0, totalPaid: 0 }
  } else if (client) {
    const clientId = await getClientId(session.user.id, session.user.email)
    if (clientId) {
      const [pc, unpaidAgg, paidAgg] = await Promise.all([
        prisma.project.count({ where: { clientId } }),
        prisma.invoice.aggregate({ where: { clientId, status: { in: ["SENT", "OVERDUE"] } }, _sum: { totalAmount: true } }),
        prisma.invoice.aggregate({ where: { clientId, status: "PAID" }, _sum: { totalAmount: true } }),
      ])
      const [unpaidInvoices, paidInvoices] = await Promise.all([
        prisma.invoice.findMany({
          where: { clientId, status: { in: ["SENT", "OVERDUE"] } },
          select: { id: true, number: true, status: true, totalAmount: true, dueDate: true, paidAt: true },
          orderBy: { dueDate: "asc" },
        }),
        prisma.invoice.findMany({
          where: { clientId, status: "PAID" },
          select: { id: true, number: true, status: true, totalAmount: true, dueDate: true, paidAt: true },
          orderBy: { paidAt: "desc" },
          take: 5,
        }),
      ])
      const firstName = session.user.name?.split(" ")[0] || "there"
      const montrealNow = getMontrealNow()
      const { hour: localHour, dayOfWeek: localDayOfWeek } = getMontrealInfo()
      const todayStr = getMontrealTodayStr()
      const cookieStore = await cookies()
      const lastClientWelcomeDate = cookieStore.get("lastClientWelcomeDate")?.value
      const lastClientGreeting = cookieStore.get("lastClientGreeting")?.value ?? null
      const welcomeMode: "full" | "brief" = lastClientWelcomeDate === todayStr ? "brief" : "full"
      const greeting = computeClientGreeting(firstName, localHour, localDayOfWeek, lastClientGreeting)
      const unpaidTotal = unpaidAgg._sum.totalAmount || 0
      const subline = unpaidInvoices.length > 0
        ? `You have ${unpaidInvoices.length} invoice${unpaidInvoices.length !== 1 ? "s" : ""} to pay`
        : null

      return (
        <>
          <ClientWelcome greeting={greeting} welcomeMode={welcomeMode} todayStr={todayStr} />
          <ClientDashboardContent
            greeting={greeting}
            subline={subline}
            unpaidInvoices={unpaidInvoices.map(i => ({ ...i, dueDate: i.dueDate.toISOString(), paidAt: i.paidAt?.toISOString() ?? null }))}
            paidInvoices={paidInvoices.map(i => ({ ...i, dueDate: i.dueDate.toISOString(), paidAt: i.paidAt?.toISOString() ?? null }))}
          />
        </>
      )
    }
  }

  const daysUntilExpiry = contract ? Math.ceil((new Date(contract.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Welcome, {session?.user?.name}</h2>
        {superAdmin && <CityFilter selected={selectedCity} />}
      </div>

      {tutor && onboardingStep < 7 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Onboarding in progress — Step {onboardingStep + 1} of 8
          </p>
          <Link href="/dashboard/onboarding" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {admin && <StatCard label="Tutors" value={stats.tutorCount} href="/dashboard/tutors" />}
        {admin && <StatCard label="Clients" value={stats.clientCount} href="/dashboard/clients" />}
        {admin && <StatCard label="Total Hours" value={stats.totalHours} href="/dashboard/hours" />}
        {admin && <StatCard label="Outstanding" value={`$${stats.pendingInvoices.toFixed(0)}`} href="/dashboard/invoices" highlight />}
        {admin && <StatCard label="New Requests" value={stats.newRequests} href="/dashboard/requests" highlight />}
      </div>
    </div>
  )
}


