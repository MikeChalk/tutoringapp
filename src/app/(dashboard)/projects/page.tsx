import { prisma } from "@/lib/db"
import Link from "next/link"

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
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
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Projects</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => {
          const totalHours = project.hourLogs.reduce((sum, h) => sum + h.hours, 0)
          return (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
            >
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{project.name}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {project.client.user.name}
              </p>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">
                  {totalHours}h logged
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    project.status === "ACTIVE"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {project.status}
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
          <p className="text-sm text-zinc-500 col-span-full">No projects yet.</p>
        )}
      </div>
    </div>
  )
}
