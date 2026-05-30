import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, getTutorId } from "@/lib/auth-helpers"
import { GRADE_LABELS, STATUS_LABELS, STATUS_COLORS } from "@/lib/constants"
import { notFound } from "next/navigation"
import { EditProjectForm } from "@/components/edit-project-form"

export default async function ProjectDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  const admin = isAdmin(session.user.role)
  const tutor = isTutor(session.user.role)

  const { id } = await props.params

  let hasAccess = true
  if (tutor) {
    const tutorId = await getTutorId(session.user.id, session.user.email)
    if (!tutorId) {
      hasAccess = false
    } else {
      const assignment = await prisma.projectTutor.findFirst({
        where: { projectId: id, tutorId },
      })
      hasAccess = !!assignment
    }
  }

  if (!hasAccess) notFound()

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: { include: { user: { select: { name: true, email: true, city: { select: { name: true } } } } } },
      city: { select: { name: true } },
      projectTutors: {
        include: { tutor: { include: { user: { select: { name: true, email: true, id: true } } } } },
      },
      hourLogs: {
        include: { tutor: { include: { user: { select: { name: true } } } } },
        orderBy: { date: "desc" },
      },
      invoices: true,
      expenses: { orderBy: { date: "desc" } },
    },
  })

  if (!project) notFound()

  // Fetch client-level invoices (invoices linked to this client but not a specific project)
  const clientInvoices = project.clientId ? await prisma.invoice.findMany({
    where: { clientId: project.clientId, projectId: null },
    orderBy: { createdAt: "desc" },
  }) : []

  const allInvoices = [...project.invoices, ...clientInvoices]

  const totalHours = project.hourLogs.reduce((sum, h) => sum + h.hours, 0)
  const totalBilled = project.hourLogs.reduce((sum, h) => sum + h.hours * h.billingRate, 0)
  const totalPay = project.hourLogs.reduce((sum, h) => sum + h.hours * h.tutorPayRate, 0)
  const totalExpenses = project.expenses.reduce((sum, e) => sum + e.amount, 0)
  const netIncome = totalBilled - totalPay - totalExpenses

  const availableTutors = admin ? await prisma.tutor.findMany({
    where: {
      onboarded: true,
      projectTutors: { none: { projectId: id } },
    },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  }) : []

  const allClients = admin ? await prisma.client.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  }) : []

  const allCities = admin ? await prisma.city.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) : []

  const grades = await prisma.billingRate.findMany({
    where: { gradeLevel: project.gradeLevel },
  })

  const subjectList = project.subjects ? project.subjects.split(",").map((s) => s.trim()).filter(Boolean) : []

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">{project.name}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
        Client: {project.client?.user.name || "N/A"} &middot; {GRADE_LABELS[project.gradeLevel]} &middot; {project.city?.name || project.client?.user.city?.name || ""} &middot; Started {new Date(project.createdAt).toLocaleDateString()}
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}>
          {STATUS_LABELS[project.status] || project.status}
        </span>
        {subjectList.map((subject) => (
          <span key={subject} className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {subject}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Total Hours</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalHours}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Income</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">${totalBilled.toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">Billed to client</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Expenses</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">${(totalPay + totalExpenses).toFixed(2)}</p>
          <p className="text-xs text-zinc-400 mt-1">Pay: ${totalPay.toFixed(2)} + Other: ${totalExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Net Income</p>
          <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            ${netIncome.toFixed(2)}
          </p>
          <p className="text-xs text-zinc-400 mt-1">Income - all costs</p>
        </div>
      </div>

      {admin && <EditProjectForm project={project} clients={allClients} cities={allCities} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Tutors</h3>
          {project.projectTutors.length === 0 ? (
            <p className="text-sm text-zinc-500 mb-3">No tutors assigned.</p>
          ) : (
            <ul className="space-y-2 mb-3">
              {project.projectTutors.map((pt) => (
                <li key={pt.id} className="text-sm flex justify-between">
                  <span className="text-zinc-900 dark:text-zinc-100">{pt.tutor.user.name}</span>
                  <span className="text-zinc-500">{pt.tutor.user.email}</span>
                </li>
              ))}
            </ul>
          )}
          {admin && availableTutors.length > 0 && (
            <form action="/api/projects/assign" method="POST" className="flex gap-2 items-end">
              <input type="hidden" name="projectId" value={project.id} />
              <select name="tutorId" required className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Add tutor...</option>
                {availableTutors.map(t => (<option key={t.id} value={t.id}>{t.user.name}</option>))}
              </select>
              <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Assign</button>
            </form>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Invoices</h3>
          {allInvoices.length === 0 ? (
            <p className="text-sm text-zinc-500">No invoices yet.</p>
          ) : (
            <ul className="space-y-2">
              {allInvoices.map((inv) => (
                <li key={inv.id} className="text-sm flex justify-between">
                  <a href={`/dashboard/invoices/${inv.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{inv.number}</a>
                  <span className="text-zinc-500">${inv.totalAmount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Expenses</h3>
          {project.expenses.length === 0 ? (
            <p className="text-sm text-zinc-500">No expenses yet.</p>
          ) : (
            <ul className="space-y-2">
              {project.expenses.map((e) => (
                <li key={e.id} className="text-sm flex justify-between">
                  <span className="text-zinc-900 dark:text-zinc-100 truncate mr-2">{e.description}</span>
                  <span className="text-red-600 dark:text-red-400 whitespace-nowrap">-${e.amount.toFixed(2)}</span>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Date</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Tutor</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Mode</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Hours</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Billing</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Tutor Pay</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {project.hourLogs.map((log) => (
                    <tr key={log.id} className="text-sm border-b border-zinc-100 dark:border-zinc-700/50">
                      <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">
                        {new Date(log.date).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">{log.tutor.user.name}</td>
                      <td className="px-2 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          log.mode === "ONLINE" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
                        }`}>{log.mode === "ONLINE" ? "Online" : "In Person"}</span>
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-900 dark:text-zinc-100">{log.hours}</td>
                      <td className="px-2 py-2 text-right text-zinc-600 dark:text-zinc-400">${(log.hours * log.billingRate).toFixed(2)}</td>
                      <td className="px-2 py-2 text-right text-green-600 dark:text-green-400">${(log.hours * log.tutorPayRate).toFixed(2)}</td>
                      <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">{log.description || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
