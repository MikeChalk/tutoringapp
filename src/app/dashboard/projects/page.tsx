import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, getTutorId, isSuperAdmin, isCityAdmin, getActiveCityId } from "@/lib/auth-helpers"
import { GRADE_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/lib/constants"
import { CityFilter } from "@/components/city-filter"
import { CreateProjectForm } from "@/components/create-project-form"
import Link from "next/link"
import Script from "next/script"

export default async function ProjectsPage(props: { searchParams: Promise<{ status?: string; type?: string; city?: string; page?: string; view?: string }> }) {
  const session = await requireAuth()
  const admin = isAdmin(session.user.role)
  const tutor = isTutor(session.user.role)

  const { status: statusFilter, type: typeFilter, city: cityParam, page: pageParam, view: viewParam } = await props.searchParams
  const projectType = typeFilter || "ALL"
  const selectedCity = cityParam || "all"
  const page = parseInt(pageParam || "1") || 1
  const pageSize = 50
  const view = viewParam || "grid"
  const superAdmin = isSuperAdmin(session.user.role)
  const cityAdminId = isCityAdmin(session.user.role) ? await getActiveCityId(session.user.role, session.user.id) : null
  const effectiveCityId = cityAdminId || (superAdmin && selectedCity !== "all" ? selectedCity : null)

  let whereClause: Record<string, unknown> = {}
  if (projectType !== "ALL") whereClause.projectType = projectType
  if (tutor) {
    const tutorId = await getTutorId(session.user.id, session.user.email)
    if (tutorId) {
      whereClause = { ...whereClause, projectTutors: { some: { tutorId } }, status: "IN_PROGRESS" }
    }
  } else {
    if (statusFilter && statusFilter !== "ALL") {
      whereClause = { ...whereClause, status: statusFilter }
    }
  }

  if (superAdmin && selectedCity !== "all") {
    whereClause = { ...whereClause, cityId: selectedCity }
  } else if (cityAdminId) {
    whereClause = { ...whereClause, cityId: cityAdminId }
  }

  const [projects, totalCount] = await Promise.all([
    prisma.project.findMany({
      where: whereClause,
      include: {
        city: { select: { name: true } },
        client: { include: { user: { select: { name: true } } } },
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

  const tabs = [
    { value: "ALL", label: "All Projects" },
    { value: "STUDENT", label: "Private Tutoring" },
    { value: "STUDY_HALL", label: "Study Hall Projects" },
  ]

  const clients = admin ? await prisma.client.findMany({
    where: effectiveCityId ? { user: { cityId: effectiveCityId } } : {},
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  }) : []

  const cities = admin ? await prisma.city.findMany({ select: { id: true, name: true } }) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Projects</h2>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-600 overflow-hidden mr-2">
            {(["grid", "list"] as const).map(v => {
              const vParams = new URLSearchParams()
              vParams.set("view", v)
              if (statusFilter && statusFilter !== "ALL") vParams.set("status", statusFilter)
              if (projectType !== "ALL") vParams.set("type", projectType)
              if (selectedCity !== "all") vParams.set("city", selectedCity)
              return (
                <Link key={v} href={`/dashboard/projects?${vParams.toString()}`}
                  className={`px-3 py-1 text-xs ${view === v ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}>
                  {v === "grid" ? "▦" : "☰"}
                </Link>
              )
            })}
          </div>
          {superAdmin && <CityFilter selected={selectedCity} />}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {tabs.map((t) => {
          const tabParams = new URLSearchParams()
          tabParams.set("type", t.value)
          if (superAdmin && selectedCity !== "all") tabParams.set("city", selectedCity)
          return (
            <Link key={t.value} href={`/dashboard/projects?${tabParams.toString()}`}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${projectType === t.value ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}>
              {t.label}
            </Link>
          )
        })}
        {admin && (
          <form id="statusForm" method="GET" className="ml-auto">
            <select name="status" defaultValue={statusFilter || "ALL"} id="statusFilterSelect"
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="ALL">All</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="FINISHED">Finished</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <input type="hidden" name="type" value={projectType} />
            {superAdmin && selectedCity !== "all" && <input type="hidden" name="city" value={selectedCity} />}
          </form>
        )}
      </div>

      {admin && (
        <CreateProjectForm
          clients={clients}
          cities={cities}
          defaultType={projectType}
          defaultCity={selectedCity}
        />
      )}

      {view === "list" ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Grade</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Hours</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Tutors</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Created</th>
                {admin && <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase w-16"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {projects.map((project) => {
                const totalHours = project.hourLogs.reduce((sum, h) => sum + h.hours, 0)
                return (
                  <tr key={project.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/projects/${project.id}`} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {project.client?.user.name || "Other"}
                      {project.city?.name && <span className="inline-flex text-xs font-medium rounded-full px-2 py-0.5 bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400 ml-2">{project.city.name}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {project.projectType === "STUDY_HALL" ? "—" : (GRADE_LABELS[project.gradeLevel] || project.gradeLevel)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_COLORS[project.status] || ""}`}>
                        {STATUS_LABELS[project.status] || project.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{totalHours}h</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {project.projectTutors.map((pt) => pt.tutor.user.name).join(", ") || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 whitespace-nowrap">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </td>
                    {admin && (
                      <td className="px-4 py-3 text-center">
                        <Link href={`/dashboard/projects/${project.id}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Edit</Link>
                      </td>
                    )}
                  </tr>
                )
              })}
              {projects.length === 0 && (
                <tr><td colSpan={admin ? 8 : 7} className="px-4 py-8 text-center text-sm text-zinc-500">No projects.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => {
          const totalHours = project.hourLogs.reduce((sum, h) => sum + h.hours, 0)
          const subjectList = project.subjects ? project.subjects.split(",").map((s) => s.trim()).filter(Boolean) : []
          return (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}
              className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{project.name}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{project.client?.user.name || "Other"}</p>
              {project.projectType === "STUDENT" && project.school && <p className="text-xs text-zinc-400 mt-0.5">{project.school}</p>}
              {project.city?.name && <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400 mt-1">{project.city.name}</span>}
              <p className="text-xs text-zinc-400 mt-0.5">{new Date(project.createdAt).toLocaleDateString()}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {GRADE_LABELS[project.gradeLevel] || project.gradeLevel}
                </span>
                {subjectList.map((s) => (
                  <span key={s} className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{s}</span>
                ))}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status] || ""}`}>
                  {STATUS_LABELS[project.status] || project.status}
                </span>
              </div>
              <div className="flex items-center justify-between mt-4 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">{totalHours}h logged</span>
                {admin && <Link href={`/dashboard/projects/${project.id}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Edit</Link>}
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                {project.projectTutors.map((pt) => pt.tutor.user.name).join(", ") || "None"}
              </p>
            </Link>
          )
        })}
        {projects.length === 0 && <p className="text-sm text-zinc-500 col-span-full">No projects.</p>}
      </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {page > 1 && (
            <a href={`/dashboard/projects?page=${page - 1}${statusFilter && statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}${projectType !== "STUDENT" ? `&type=${projectType}` : ""}${selectedCity !== "all" ? `&city=${selectedCity}` : ""}`}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Previous
            </a>
          )}
          <span className="text-sm text-zinc-500 px-2">Page {page} of {totalPages} ({totalCount} total)</span>
          {page < totalPages && (
            <a href={`/dashboard/projects?page=${page + 1}${statusFilter && statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}${projectType !== "STUDENT" ? `&type=${projectType}` : ""}${selectedCity !== "all" ? `&city=${selectedCity}` : ""}`}
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
