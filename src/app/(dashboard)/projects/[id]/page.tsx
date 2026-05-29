import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

export default async function ProjectDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: { include: { user: { select: { name: true, email: true } } } },
      projectTutors: {
        include: { tutor: { include: { user: { select: { name: true, email: true } } } } },
      },
      hourLogs: {
        include: { tutor: { include: { user: { select: { name: true } } } } },
        orderBy: { date: "desc" },
      },
      invoices: true,
    },
  })

  if (!project) notFound()

  const totalHours = project.hourLogs.reduce((sum, h) => sum + h.hours, 0)
  const approvedHours = project.hourLogs
    .filter((h) => h.status === "APPROVED")
    .reduce((sum, h) => sum + h.hours, 0)

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{project.name}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Client: {project.client.user.name}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Total Hours</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalHours}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Approved Hours</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{approvedHours}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Hourly Rate</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            ${project.hourlyRate.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Tutors</h3>
          {project.projectTutors.length === 0 ? (
            <p className="text-sm text-zinc-500">No tutors assigned.</p>
          ) : (
            <ul className="space-y-2">
              {project.projectTutors.map((pt) => (
                <li key={pt.id} className="text-sm flex justify-between">
                  <span className="text-zinc-900 dark:text-zinc-100">{pt.tutor.user.name}</span>
                  <span className="text-zinc-500">{pt.tutor.user.email}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Invoices</h3>
          {project.invoices.length === 0 ? (
            <p className="text-sm text-zinc-500">No invoices yet.</p>
          ) : (
            <ul className="space-y-2">
              {project.invoices.map((inv) => (
                <li key={inv.id} className="text-sm flex justify-between">
                  <span className="text-zinc-900 dark:text-zinc-100">{inv.number}</span>
                  <span className="text-zinc-500">${inv.totalAmount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Hours Log</h3>
          {project.hourLogs.length === 0 ? (
            <p className="text-sm text-zinc-500">No hours logged yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Date</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Tutor</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Hours</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Description</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {project.hourLogs.map((log) => (
                  <tr key={log.id} className="text-sm border-b border-zinc-100 dark:border-zinc-700/50">
                    <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">
                      {new Date(log.date).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">
                      {log.tutor.user.name}
                    </td>
                    <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">{log.hours}</td>
                    <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">
                      {log.description || "-"}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${
                          log.status === "APPROVED"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : log.status === "PENDING"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
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
