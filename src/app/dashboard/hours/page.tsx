import { prisma } from "@/lib/db"
import { requireAuth, isTutor, getTutorId, isSuperAdmin, isAdmin, getCityAccessScope } from "@/lib/auth-helpers"
import { NoCityAccess } from "@/components/no-city-access"
import { CityFilter } from "@/components/city-filter"
import { DeleteHourButton } from "@/components/delete-hour-button"
import { ModeBadge, StatusBadge } from "@/components/ui"
import EditHourLog from "@/components/edit-hour-log"
import HourLogForm from "@/components/hour-log-form"
import { EmptyState } from "@/components/empty-state"
import { SortHeader } from "@/components/sort-header"
import { Clock } from "lucide-react"
import { Prisma } from "@prisma/client"
import Link from "next/link"

function getSortOrderBy(sort: string, order: string): Prisma.HourLogOrderByWithRelationInput {
  const dir: Prisma.SortOrder = order === "asc" ? "asc" : "desc"
  switch (sort) {
    case "tutor": return { tutor: { user: { name: dir } } }
    case "project": return { project: { name: dir } }
    case "client": return { project: { client: { user: { name: dir } } } }
    case "hours": return { hours: dir }
    case "billingRate": return { billingRate: dir }
    case "tutorPayRate": return { tutorPayRate: dir }
    case "mode": return { mode: dir }
    default: return { date: dir }
  }
}

type TutorWithUser = Prisma.TutorGetPayload<{ include: { user: { select: { name: true } } } }>

export default async function HoursPage(props: { searchParams: Promise<{ city?: string; search?: string; page?: string; sort?: string; order?: string }> }) {
  const session = await requireAuth()
  const tutor = isTutor(session.user.role)
  const superAdmin = isSuperAdmin(session.user.role)
  const admin = isAdmin(session.user.role)

  const { city: cityParam, search: searchParam, page: pageParam, sort: sortParam, order: orderParam } = await props.searchParams
  const selectedCity = cityParam || "all"
  const searchQuery = searchParam || ""
  const page = parseInt(pageParam || "1") || 1
  const pageSize = 50
  const sort = sortParam || "date"
  const order = orderParam || "desc"
  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return <NoCityAccess />
  const cityAdminId = scope.kind === "single" ? scope.cityId : null
  const effectiveCityId = cityAdminId || (superAdmin && selectedCity !== "all" ? selectedCity : null)

  let tutorId: string | null = null

  if (tutor) {
    tutorId = await getTutorId(session.user.id, session.user.email)
  }

  let hourLogsWhere: Record<string, unknown> = tutor && tutorId
      ? { tutorId }
      : effectiveCityId
        ? { project: { cityId: effectiveCityId } }
        : {}
  if (searchQuery) {
    hourLogsWhere = {
      ...hourLogsWhere,
      OR: [
        { tutor: { user: { name: { contains: searchQuery } } } },
        { project: { name: { contains: searchQuery } } },
        { project: { client: { user: { name: { contains: searchQuery } } } } },
      ],
    }
  }

  const [hourLogs, totalCount] = await Promise.all([
    prisma.hourLog.findMany({
      where: hourLogsWhere,
      include: {
        tutor: { include: { user: { select: { name: true } } } },
        project: { select: { name: true, gradeLevel: true, status: true, client: { select: { user: { select: { name: true } } } }, city: { select: { name: true } } } },
      },
      orderBy: getSortOrderBy(sort, order),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.hourLog.count({ where: hourLogsWhere }),
  ])

  const [projects, tutors] = await Promise.all([
    prisma.project.findMany({
      where: tutor && tutorId
        ? { projectTutors: { some: { tutorId } } }
        : effectiveCityId
          ? { cityId: effectiveCityId }
          : {},
      include: {
        client: { select: { user: { select: { name: true } }, type: true } },
        projectTutors: { include: { tutor: { include: { user: { select: { name: true, id: true } } } } } },
      },
    }),
    tutor
      ? (tutorId
          ? prisma.tutor.findMany({
              where: { id: tutorId, isActive: true },
              include: { user: { select: { name: true } } },
            })
          : Promise.resolve([] as TutorWithUser[])
        )
      : prisma.tutor.findMany({
          where: { isActive: true, ...(effectiveCityId ? { user: { cityId: effectiveCityId } } : {}) },
          include: { user: { select: { name: true } } },
        }),
  ])

  let adminTutorId: string | null = null
  if (admin) {
    const adminTutor = await prisma.tutor.findUnique({
      where: { userId: session.user.id, isActive: true },
    })
    if (adminTutor) {
      adminTutorId = adminTutor.id
    }
  }

  let contractRates: Record<string, number> = {}
  let tutorContracts: Record<string, Record<string, number>> = {}
  let billingRates: Record<string, number> = {}
  if (tutor && tutorId) {
    const contract = await prisma.contract.findFirst({ where: { tutorId, status: "ACTIVE" }, select: { rates: true } })
    if (contract?.rates) {
      try { contractRates = JSON.parse(contract.rates) } catch { /* ignore */ }
    }
  } else if (admin) {
    const [allContracts, allBillingRates] = await Promise.all([
      prisma.contract.findMany({
        where: { status: "ACTIVE", tutorId: { in: tutors.map(t => t.id) } },
        select: { tutorId: true, rates: true },
      }),
      prisma.billingRate.findMany({ select: { gradeLevel: true, mode: true, projectType: true, rate: true } }),
    ])
    for (const c of allContracts) {
      if (c.rates) {
        try { tutorContracts[c.tutorId] = JSON.parse(c.rates) } catch { tutorContracts[c.tutorId] = {} }
      }
    }
    for (const r of allBillingRates) {
      billingRates[`${r.gradeLevel}|${r.mode}|${r.projectType}`] = r.rate
    }
  }

  const tutorProjectsMap: Record<string, string[]> = {}
  for (const p of projects) {
    for (const pt of p.projectTutors) {
      const tid = pt.tutorId
      if (!tutorProjectsMap[tid]) tutorProjectsMap[tid] = []
      tutorProjectsMap[tid].push(p.id)
    }
  }

  const baseParams: Record<string, string | undefined> = {}
  if (selectedCity !== "all") baseParams.city = selectedCity
  if (searchQuery) baseParams.search = searchQuery

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Log Hours</h2>
        <div className="flex items-center gap-3">
          <form action="/dashboard/hours" method="GET" className="flex gap-2">
            {selectedCity !== "all" ? <input type="hidden" name="city" value={selectedCity} /> : null}
            <input type="text" name="search" key={searchQuery} defaultValue={searchQuery} placeholder="Search tutor, project, or client..."
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56" />
            <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Search</button>
            {searchQuery && (() => { const p = new URLSearchParams(); if (selectedCity !== "all") p.set("city", selectedCity); const qs = p.toString(); return <Link href={`/dashboard/hours${qs ? `?${qs}` : ""}`} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700">Clear</Link> })()}
          </form>
          <a href="/api/export?type=hours" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Export CSV</a>
          {superAdmin && <CityFilter selected={selectedCity} />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Recent Entries</h3>
          {hourLogs.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No hours logged yet"
              description="Log your first tutoring session using the form on the right."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="text-left px-4 py-3 text-xs font-medium"><SortHeader label="Date" field="date" currentSort={sort} currentOrder={order} searchParams={baseParams} /></th>
                    {!tutor && <th className="text-left px-4 py-3 text-xs font-medium"><SortHeader label="Tutor" field="tutor" currentSort={sort} currentOrder={order} searchParams={baseParams} /></th>}
                    <th className="text-left px-4 py-3 text-xs font-medium"><SortHeader label="Student" field="project" currentSort={sort} currentOrder={order} searchParams={baseParams} /></th>
                    <th className="text-left px-4 py-3 text-xs font-medium"><SortHeader label="Client" field="client" currentSort={sort} currentOrder={order} searchParams={baseParams} /></th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">City</th>
                    <th className="text-left px-4 py-3 text-xs font-medium"><SortHeader label="Mode" field="mode" currentSort={sort} currentOrder={order} searchParams={baseParams} /></th>
                    <th className="text-right px-4 py-3 text-xs font-medium"><SortHeader label="Hrs" field="hours" currentSort={sort} currentOrder={order} searchParams={baseParams} /></th>
                    {!tutor && <th className="text-right px-4 py-3 text-xs font-medium"><SortHeader label="Bill $/hr" field="billingRate" currentSort={sort} currentOrder={order} searchParams={baseParams} /></th>}
                    <th className="text-right px-4 py-3 text-xs font-medium"><SortHeader label="Pay $/hr" field="tutorPayRate" currentSort={sort} currentOrder={order} searchParams={baseParams} /></th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Total Pay</th>
                    {(admin || tutor) && <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {hourLogs.map((log) => (
                    <tr key={log.id} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/30">
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {new Date(log.date).toLocaleDateString()}
                      </td>
                      {!tutor && <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{log.tutor.user.name}</td>}
                      <td className="px-4 py-3">
                        <span className="text-zinc-900 dark:text-zinc-100">{log.project.name}</span>
                        <span className="ml-2"><StatusBadge status={log.project.status} /></span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{log.project.client?.user.name || "Other"}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{log.project.city?.name || "-"}</td>
                      <td className="px-4 py-3">
                        <ModeBadge mode={log.mode} />
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-100">{log.hours}</td>
                      {!tutor && <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">${log.billingRate.toFixed(2)}</td>}
                      <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">${log.tutorPayRate.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">${(log.hours * log.tutorPayRate).toFixed(2)}</td>
                      {admin && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <EditHourLog
                              id={log.id}
                              hours={log.hours}
                              date={new Date(log.date).toISOString().split("T")[0]}
                              mode={log.mode}
                              billingRate={log.billingRate}
                              tutorPayRate={log.tutorPayRate}
                              description={log.description}
                              canEditRates={superAdmin}
                            />
                            <DeleteHourButton id={log.id} />
                          </div>
                        </td>
                      )}
                      {tutor && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <EditHourLog
                              id={log.id}
                              hours={log.hours}
                              date={new Date(log.date).toISOString().split("T")[0]}
                              mode={log.mode}
                              billingRate={log.billingRate}
                              tutorPayRate={log.tutorPayRate}
                              description={log.description}
                              canEditRates={false}
                            />
                            <DeleteHourButton id={log.id} />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Log New Hours</h3>
          <HourLogForm
            projects={projects}
            tutors={tutors}
            defaultTutorId={tutorId}
            isTutor={tutor}
            adminTutorId={adminTutorId}
            tutorProjectsMap={tutorProjectsMap}
            billingRates={billingRates}
            tutorContracts={tutorContracts}
            contractRates={contractRates}
          />
        </div>
      </div>

      {totalCount > pageSize && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {page > 1 && (
            <Link href={`/dashboard/hours?page=${page - 1}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}${selectedCity !== "all" ? `&city=${selectedCity}` : ""}`}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Previous
            </Link>
          )}
          <span className="text-sm text-zinc-500 px-2">Page {page} of {Math.ceil(totalCount / pageSize)} ({totalCount} total)</span>
          {page < Math.ceil(totalCount / pageSize) && (
            <Link href={`/dashboard/hours?page=${page + 1}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}${selectedCity !== "all" ? `&city=${selectedCity}` : ""}`}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
