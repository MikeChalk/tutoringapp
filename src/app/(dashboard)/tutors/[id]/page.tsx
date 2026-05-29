import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

export default async function TutorDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  const tutor = await prisma.tutor.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      hourLogs: {
        include: { project: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 20,
      },
      projectTutors: {
        include: { project: { select: { name: true, status: true } } },
      },
    },
  })

  if (!tutor) notFound()

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{tutor.user.name}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{tutor.user.email}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Profile</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Hourly Rate</dt>
              <dd className="text-zinc-900 dark:text-zinc-100 font-medium">${tutor.hourlyRate.toFixed(2)}/hr</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Subjects</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{typeof tutor.subjects === "string" ? tutor.subjects : (tutor.subjects as string[]).join(", ") || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Status</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">
                {tutor.onboarded ? "Active" : tutor.isActive ? "Waitlist" : "Inactive"}
              </dd>
            </div>
            {tutor.bio && (
              <div>
                <dt className="text-zinc-500 mb-1">Bio</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">{tutor.bio}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Projects</h3>
          {tutor.projectTutors.length === 0 ? (
            <p className="text-sm text-zinc-500">No projects assigned.</p>
          ) : (
            <ul className="space-y-2">
              {tutor.projectTutors.map((pt) => (
                <li key={pt.id} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-900 dark:text-zinc-100">{pt.project.name}</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      pt.project.status === "ACTIVE"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                    }`}
                  >
                    {pt.project.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Recent Hours</h3>
          {tutor.hourLogs.length === 0 ? (
            <p className="text-sm text-zinc-500">No hours logged yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Date</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Project</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Hours</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {tutor.hourLogs.map((log) => (
                  <tr key={log.id} className="text-sm">
                    <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">
                      {new Date(log.date).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">{log.project.name}</td>
                    <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">{log.hours}</td>
                    <td className="px-2 py-2">{statusBadge(log.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }
  return (
    <span className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${colors[status] || ""}`}>
      {status}
    </span>
  )
}
