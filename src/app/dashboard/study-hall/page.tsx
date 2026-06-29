import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isSuperAdmin, getCityAccessScope } from "@/lib/auth-helpers"
import { NoCityAccess } from "@/components/no-city-access"
import { CityFilter } from "@/components/city-filter"
import { STUDY_HALL_BILLING_MODEL_LABELS, STUDY_HALL_CYCLE_STATUS_LABELS, STUDY_HALL_CYCLE_STATUS_COLORS } from "@/lib/constants"
import Link from "next/link"
import Script from "next/script"

export const dynamic = "force-dynamic"

export default async function StudyHallPage(props: { searchParams: Promise<{ city?: string; status?: string }> }) {
  const session = await requireAuth()
  const admin = isAdmin(session.user.role)
  if (!admin) {
    return <NoCityAccess />
  }

  const superAdmin = isSuperAdmin(session.user.role)
  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return <NoCityAccess />
  const cityAdminId = scope.kind === "single" ? scope.cityId : null

  const { city: cityParam, status: statusFilter } = await props.searchParams
  const selectedCity = cityParam || "all"

  const effectiveCityId = cityAdminId || (superAdmin && selectedCity !== "all" ? selectedCity : null)

  const where: Record<string, unknown> = {}
  if (effectiveCityId) where.cityId = effectiveCityId
  if (statusFilter && statusFilter !== "ALL") where.status = statusFilter

  const cycles = await prisma.studyHallCycle.findMany({
    where,
    include: {
      schoolClient: { include: { user: { select: { name: true } } } },
      city: { select: { name: true } },
      project: { select: { name: true } },
      registrations: { select: { id: true, status: true, totalAmount: true } },
    },
    orderBy: [{ startDate: "desc" }],
  })

  const clients = await prisma.client.findMany({
    where: { type: "SCHOOL", ...(effectiveCityId ? { user: { cityId: effectiveCityId } } : {}) },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  })

  const projects = await prisma.project.findMany({
    where: { projectType: "STUDY_HALL", ...(effectiveCityId ? { cityId: effectiveCityId } : {}) },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const cities = superAdmin ? await prisma.city.findMany({ select: { id: true, name: true } }) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Study Hall Cycles</h2>
          <p className="text-sm text-zinc-500">Registration cycles for after-school programs</p>
        </div>
        <div className="flex items-center gap-4">
          {superAdmin && <CityFilter selected={selectedCity} />}
          {admin && (
            <form id="statusForm">
              <select name="status" defaultValue={statusFilter || "ALL"} id="statusFilterSelect"
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </form>
          )}
        </div>
      </div>

      {admin && clients.length > 0 && (
        <details className="mb-6">
          <summary className="cursor-pointer text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">+ New Cycle</summary>
          <NewCycleForm clients={clients} cities={cities} cityAdminId={cityAdminId} projects={projects} />
        </details>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cycles.map((cycle) => {
          const regs = cycle.registrations
          const pendingCount = regs.filter(r => r.status === "PENDING").length
          const confirmedCount = regs.filter(r => r.status === "CONFIRMED" || r.status === "PAID").length
          const revenue = regs.filter(r => r.status === "PAID").reduce((s, r) => s + r.totalAmount, 0)
          return (
            <Link key={cycle.id} href={`/dashboard/study-hall/${cycle.id}`}
              className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{cycle.name}</h3>
                <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STUDY_HALL_CYCLE_STATUS_COLORS[cycle.status] || ""}`}>
                  {STUDY_HALL_CYCLE_STATUS_LABELS[cycle.status as keyof typeof STUDY_HALL_CYCLE_STATUS_LABELS] || cycle.status}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mb-1">{cycle.schoolClient?.user.name || "No school assigned"}</p>
              <p className="text-xs text-zinc-400 mb-2">
                {new Date(cycle.startDate).toLocaleDateString()} — {new Date(cycle.endDate).toLocaleDateString()}
              </p>
              <p className="text-xs text-zinc-500 mb-3">{STUDY_HALL_BILLING_MODEL_LABELS[cycle.billingModel as keyof typeof STUDY_HALL_BILLING_MODEL_LABELS] || cycle.billingModel}</p>
              <div className="flex items-center gap-4 text-sm">
                {cycle.billingModel !== "LUMP_SUM" && (
                  <>
                    <span className="text-amber-600 dark:text-amber-400">{pendingCount} pending</span>
                    <span className="text-blue-600 dark:text-blue-400">{confirmedCount} confirmed</span>
                  </>
                )}
                {revenue > 0 && <span className="text-green-600 dark:text-green-400">${revenue.toFixed(2)}</span>}
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 truncate">
                {cycle.project?.name || "No project linked"}
              </p>
            </Link>
          )
        })}
        {cycles.length === 0 && <p className="text-sm text-zinc-500 col-span-full">No study hall cycles yet. Create one above.</p>}
      </div>

      {admin && <Script id="statusFormScript" strategy="afterInteractive">{`document.getElementById('statusFilterSelect')?.addEventListener('change',function(){this.form.submit()})`}</Script>}
    </div>
  )
}

function NewCycleForm({ clients, cities, cityAdminId, projects }: { clients: Array<{ id: string; user: { name: string } }>; cities: Array<{ id: string; name: string }>; cityAdminId: string | null; projects: Array<{ id: string; name: string }> }) {
  return (
    <form action="/api/study-hall/cycles" method="POST" className="mt-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 space-y-4">
      <input type="hidden" name="_action" value="create" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Cycle name *</label>
          <input type="text" name="name" required placeholder="Bialik Study Hall 2025-2026: Cycle 2"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <p className="text-xs text-zinc-400 mt-1">The registration URL will be auto-generated from the name.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">School (client) *</label>
          <select name="schoolClientId" required
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select school...</option>
            {clients.map(c => (<option key={c.id} value={c.id}>{c.user.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Linked study hall project</label>
          <select name="projectId"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">No project linked</option>
            {projects.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Billing model *</label>
          <select name="billingModel" defaultValue="INDIVIDUAL"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="INDIVIDUAL">Individual (we register & invoice each parent)</option>
            <option value="LUMP_SUM_ROSTER">Lump Sum + Roster (school sends list, one invoice)</option>
            <option value="LUMP_SUM">Lump Sum (no registration)</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Start date *</label>
          <input type="date" name="startDate" required
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">End date *</label>
          <input type="date" name="endDate" required
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Price per session</label>
          <input type="number" name="pricePerSession" step="0.01" defaultValue="27"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      {!cityAdminId && cities.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">City</label>
          <select name="cityId"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">No city</option>
            {cities.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
      )}
      {cityAdminId && <input type="hidden" name="cityId" value={cityAdminId} />}
      <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Create Cycle</button>
      <p className="text-xs text-zinc-500">You can edit day options, grade options, form fields, and text blocks after creating the cycle.</p>
    </form>
  )
}
