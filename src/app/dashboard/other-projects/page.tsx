import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, getTutorId, isSuperAdmin, getCityAccessScope } from "@/lib/auth-helpers"
import { NoCityAccess } from "@/components/no-city-access"
import { GRADE_LABELS } from "@/lib/constants"
import { CityFilter } from "@/components/city-filter"
import { StatusBadge } from "@/components/ui"
import { CreateProjectForm } from "@/components/create-project-form"
import Link from "next/link"
import Script from "next/script"

export default async function OtherProjectsPage(props: { searchParams: Promise<{ status?: string; city?: string; page?: string }> }) {
  const session = await requireAuth()
  const admin = isAdmin(session.user.role)
  const tutor = isTutor(session.user.role)

  const { status: statusFilter, city: cityParam, page: pageParam } = await props.searchParams
  const selectedCity = cityParam || "all"
  const page = parseInt(pageParam || "1") || 1
  const pageSize = 50
  const superAdmin = isSuperAdmin(session.user.role)
  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return <NoCityAccess />
  const cityAdminId = scope.kind === "single" ? scope.cityId : null
  const effectiveCityId = cityAdminId || (superAdmin && selectedCity !== "all" ? selectedCity : null)

  let whereClause: Record<string, unknown> = { projectType: "STUDY_HALL" }
  if (tutor) {
    const tutorId = await getTutorId(session.user.id, session.user.email)
    if (tutorId) {
      whereClause = { ...whereClause, projectTutors: { some: { tutorId } }, status: "IN_PROGRESS" }
    }
  } else {
    if (statusFilter && statusFilter !== "ALL") {
      whereClause = { ...whereClause, status: statusFilter }
    } else if (!statusFilter) {
      whereClause = { ...whereClause, status: "IN_PROGRESS" }
    }
  }

  if (effectiveCityId) {
    whereClause = { ...whereClause, cityId: effectiveCityId }
  }

  const [projects, totalCount] = await Promise.all([
    prisma.project.findMany({
      where: whereClause,
      include: {
        city: { select: { name: true } },
        projectTutors: {
          include: { tutor: { include: { user: { select: { name: true } } } } },
        },
        hourLogs: { select: { hours: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.project.count({ where: whereClause }),
  ])
  const totalPages = Math.ceil(totalCount / pageSize)

  const clients = admin ? await prisma.client.findMany({
    where: effectiveCityId ? { user: { cityId: effectiveCityId } } : {},
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  }) : []

  const cities = admin ? await prisma.city.findMany({ select: { id: true, name: true } }) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Other Projects</h2>
          <p className="text-sm text-zinc-500">Study Hall & group programs</p>
        </div>
        <div className="flex items-center gap-4">
          {superAdmin && <CityFilter selected={selectedCity} />}
          {admin && (
            <form id="statusForm">
              <select name="status" defaultValue={statusFilter || "IN_PROGRESS"} id="statusFilterSelect"
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ALL">All</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="FINISHED">Finished</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </form>
          )}
        </div>
      </div>

      {admin && <CreateProjectForm clients={clients} cities={cities} defaultType="STUDY_HALL" defaultCity={selectedCity} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => {
          const totalHours = project.hourLogs.reduce((sum, h) => sum + h.hours, 0)
          return (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}
              className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{project.name}</h3>
              {project.city?.name && <p className="text-xs text-zinc-400 mt-0.5">{project.city.name}</p>}
              <p className="text-xs text-zinc-400 mt-0.5">{new Date(project.createdAt).toLocaleDateString()}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {GRADE_LABELS[project.gradeLevel] || project.gradeLevel}
                </span>
                <StatusBadge status={project.status} />
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">{totalHours}h logged</span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                {project.projectTutors.map((pt) => pt.tutor.user.name).join(", ") || "No supervisor"}
              </p>
            </Link>
          )
        })}
        {projects.length === 0 && <p className="text-sm text-zinc-500 col-span-full">No other projects yet.</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {page > 1 && (
            <a href={`/dashboard/other-projects?page=${page - 1}${statusFilter && statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}${selectedCity !== "all" ? `&city=${selectedCity}` : ""}`}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Previous
            </a>
          )}
          <span className="text-sm text-zinc-500 px-2">Page {page} of {totalPages} ({totalCount} total)</span>
          {page < totalPages && (
            <a href={`/dashboard/other-projects?page=${page + 1}${statusFilter && statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}${selectedCity !== "all" ? `&city=${selectedCity}` : ""}`}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Next
            </a>
          )}
        </div>
      )}
      {admin && <Script id="statusFormScript" strategy="afterInteractive">{`document.getElementById('statusFilterSelect')?.addEventListener('change',function(){this.form.submit()})`}</Script>}
    </div>
  )
}
