import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, getTutorId } from "@/lib/auth-helpers"
import { GRADE_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/lib/constants"
import Link from "next/link"

export default async function ProjectsPage(props: { searchParams: Promise<{ status?: string }> }) {
  const session = await requireAuth()
  const admin = isAdmin(session.user.role)
  const tutor = isTutor(session.user.role)

  const { status: statusFilter } = await props.searchParams

  let whereClause: Record<string, unknown> = {}
  if (tutor) {
    const tutorId = await getTutorId(session.user.id, session.user.email)
    if (tutorId) {
      whereClause = { projectTutors: { some: { tutorId } }, status: "IN_PROGRESS" }
    }
  } else {
    if (!statusFilter || statusFilter === "ALL") {
      whereClause = {}
    } else {
      whereClause = { status: statusFilter }
    }
  }

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      client: { include: { user: { select: { name: true } } } },
      projectTutors: {
        include: { tutor: { include: { user: { select: { name: true } } } } },
      },
      hourLogs: { select: { hours: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Student Projects</h2>
        {admin && (
          <form id="statusForm">
            <select
              name="status"
              defaultValue={statusFilter || "IN_PROGRESS"}
              id="statusFilterSelect"
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="FINISHED">Finished</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => {
          const totalHours = project.hourLogs.reduce((sum, h) => sum + h.hours, 0)
          const subjectList = project.subjects ? project.subjects.split(",").map((s) => s.trim()).filter(Boolean) : []
          return (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
            >
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{project.name}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {project.client?.user.name || "Other Project"}
              </p>
              {project.school && (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{project.school}</p>
              )}
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {GRADE_LABELS[project.gradeLevel] || project.gradeLevel}
                </span>
                {subjectList.map((subject) => (
                  <span key={subject} className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {subject}
                  </span>
                ))}
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}>
                  {STATUS_LABELS[project.status] || project.status}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">
                  {totalHours}h logged
                </span>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                Tutors:{" "}
                {project.projectTutors.map((pt) => pt.tutor.user.name).join(", ") || "None"}
              </p>
            </Link>
          )
        })}
        {projects.length === 0 && (
          <p className="text-sm text-zinc-500 col-span-full">No projects found.</p>
        )}
      </div>
      {admin && <script dangerouslySetInnerHTML={{ __html: `document.getElementById('statusFilterSelect')?.addEventListener('change',function(){this.form.submit()})` }} />}
    </div>
  )
}
