import { prisma } from "@/lib/db"

export default async function HoursPage() {
  const [hourLogs, projects, tutors] = await Promise.all([
    prisma.hourLog.findMany({
      include: {
        tutor: { include: { user: { select: { name: true } } } },
        project: { select: { name: true, client: { select: { user: { select: { name: true } } } } } },
      },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.project.findMany({
      include: {
        projectTutors: {
          include: { tutor: { include: { user: { select: { name: true, id: true } } } } },
        },
      },
    }),
    prisma.tutor.findMany({
      include: { user: { select: { name: true } } },
    }),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Log Hours</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Recent Entries</h3>
          {hourLogs.length === 0 ? (
            <p className="text-sm text-zinc-500">No hours logged yet. Use the form to add entries.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Date</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Tutor</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Project</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Client</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Hours</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                {hourLogs.map((log) => (
                  <tr key={log.id} className="text-sm">
                    <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">
                      {new Date(log.date).toLocaleDateString()}
                    </td>
                    <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">
                      {log.tutor.user.name}
                    </td>
                    <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">{log.project.name}</td>
                    <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">
                      {log.project.client.user.name}
                    </td>
                    <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">{log.hours}</td>
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

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Log New Hours</h3>
          <form action="/api/hours" method="POST" className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Project
              </label>
              <select
                name="projectId"
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Tutor
              </label>
              <select
                name="tutorId"
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select tutor</option>
                {tutors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Date
              </label>
              <input
                type="date"
                name="date"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Hours
              </label>
              <input
                type="number"
                name="hours"
                required
                min="0.25"
                step="0.25"
                defaultValue="1"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={2}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
            >
              Log Hours
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
