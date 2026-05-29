import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, getTutorId } from "@/lib/auth-helpers"
import { notFound } from "next/navigation"

const GRADE_LABELS: Record<string, string> = {
  ELEMENTARY: "Elementary",
  SEC1_2: "Sec 1-2",
  SEC3: "Sec 3",
  SEC4_5: "Sec 4-5",
  CEGEP: "CEGEP",
  UNI: "University",
}

const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ON_HOLD: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  FINISHED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  FINISHED: "Finished",
  CANCELLED: "Cancelled",
}

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
      client: { include: { user: { select: { name: true, email: true } } } },
      projectTutors: {
        include: { tutor: { include: { user: { select: { name: true, email: true, id: true } } } } },
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
  const approvedHours = project.hourLogs.filter((h) => h.status === "APPROVED").reduce((sum, h) => sum + h.hours, 0)
  const totalBilled = project.hourLogs.reduce((sum, h) => sum + h.hours * h.billingRate, 0)
  const totalPay = project.hourLogs.reduce((sum, h) => sum + h.hours * h.tutorPayRate, 0)

  const grades = await prisma.billingRate.findMany({
    where: { gradeLevel: project.gradeLevel },
  })

  const subjectList = project.subjects ? project.subjects.split(",").map((s) => s.trim()).filter(Boolean) : []

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">{project.name}</h2>
      {project.school && (
        <p className="text-base font-medium text-zinc-600 dark:text-zinc-300 mb-1">{project.school}</p>
      )}
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
        Client: {project.client.user.name} &middot; {GRADE_LABELS[project.gradeLevel]} &middot; Started {new Date(project.createdAt).toLocaleDateString()}
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

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Total Hours</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalHours}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Approved Hrs</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{approvedHours}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Total Billed</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">${totalBilled.toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Tutor Pay Owed</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">${totalPay.toFixed(2)}</p>
        </div>
      </div>

      {grades.length > 0 && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Billing Rates ({GRADE_LABELS[project.gradeLevel]})</h3>
          <div className="flex gap-4">
            {grades.map((g) => (
              <div key={g.id} className="flex-1 bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 text-center">
                <p className="text-xs text-zinc-500 mb-1">{g.mode === "ONLINE" ? "Online" : "In Person"}</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">${g.rate}/hr</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Status</th>
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
                      <td className="px-2 py-2">
                        <span className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${
                          log.status === "APPROVED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          log.status === "PENDING" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>{log.status}</span>
                      </td>
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
