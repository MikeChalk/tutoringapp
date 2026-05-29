import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect, notFound } from "next/navigation"

const TENURE_LABELS: Record<string, string> = {
  "1ST_YEAR": "Year 1",
  "2ND_YEAR": "Year 2",
  "3RD_YEAR": "Year 3+",
}

const GRADE_LABELS: Record<string, string> = {
  ELEMENTARY: "Elementary",
  SEC1_2: "Sec 1-2",
  SEC3: "Sec 3",
  SEC4_5: "Sec 4-5",
  CEGEP: "CEGEP",
  UNI: "University",
}

export default async function TutorDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const { id } = await props.params

  const tutor = await prisma.tutor.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      hourLogs: {
        include: { project: { select: { name: true, gradeLevel: true } } },
        orderBy: { date: "desc" },
        take: 30,
      },
      projectTutors: {
        include: { project: { select: { name: true, status: true, gradeLevel: true } } },
      },
    },
  })

  if (!tutor) notFound()

  const totalHours = tutor.hourLogs.reduce((sum, h) => sum + h.hours, 0)
  const totalPay = tutor.hourLogs.reduce((sum, h) => sum + h.hours * h.tutorPayRate, 0)

  const payScales = await prisma.payScale.findMany({
    where: { tenure: tutor.tenure },
    orderBy: [{ gradeLevel: "asc" }, { mode: "asc" }],
  })

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{tutor.user.name}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{tutor.user.email}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Total Hours</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalHours}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Total Pay Owed</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">${totalPay.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Profile</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Tenure</dt>
              <dd className="text-zinc-900 dark:text-zinc-100 font-medium">{TENURE_LABELS[tutor.tenure]}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Subjects</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{tutor.subjects || "-"}</dd>
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
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Pay Scale ({TENURE_LABELS[tutor.tenure]})</h3>
          {payScales.length === 0 ? (
            <p className="text-sm text-zinc-500">No pay scales configured.</p>
          ) : (
            <div className="space-y-2">
              {["ELEMENTARY", "SEC1_2", "SEC3", "SEC4_5", "CEGEP", "UNI"].map((grade) => {
                const onlineRate = payScales.find((p) => p.gradeLevel === grade && p.mode === "ONLINE")
                const inPersonRate = payScales.find((p) => p.gradeLevel === grade && p.mode === "IN_PERSON")
                return (
                  <div key={grade} className="flex justify-between items-center text-sm py-1.5 border-b border-zinc-100 dark:border-zinc-700/50 last:border-0">
                    <span className="text-zinc-600 dark:text-zinc-400">{GRADE_LABELS[grade]}</span>
                    <div className="flex gap-3">
                      <span className="text-purple-600 dark:text-purple-400">Online ${onlineRate?.rate?.toFixed(0) || "-"}</span>
                      <span className="text-cyan-600 dark:text-cyan-400">In-person ${inPersonRate?.rate?.toFixed(0) || "-"}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Assigned Students</h3>
          {tutor.projectTutors.length === 0 ? (
            <p className="text-sm text-zinc-500">No projects assigned.</p>
          ) : (
            <ul className="space-y-2">
              {tutor.projectTutors.map((pt) => (
                <li key={pt.id} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-900 dark:text-zinc-100">{pt.project.name}</span>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-zinc-500">{GRADE_LABELS[pt.project.gradeLevel]}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      pt.project.status === "IN_PROGRESS" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      pt.project.status === "ON_HOLD" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                      pt.project.status === "FINISHED" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      pt.project.status === "CANCELLED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                    }`}>{pt.project.status}</span>
                  </div>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Date</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Project</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Mode</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Hours</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Pay Rate</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {tutor.hourLogs.map((log) => (
                    <tr key={log.id} className="text-sm border-b border-zinc-100 dark:border-zinc-700/50">
                      <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">
                        {new Date(log.date).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">{log.project.name}</td>
                      <td className="px-2 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          log.mode === "ONLINE" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
                        }`}>{log.mode === "ONLINE" ? "Online" : "In Person"}</span>
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-900 dark:text-zinc-100">{log.hours}</td>
                      <td className="px-2 py-2 text-right text-green-600 dark:text-green-400">${log.tutorPayRate.toFixed(2)}/hr</td>
                      <td className="px-2 py-2 text-right font-medium text-green-600 dark:text-green-400">${(log.hours * log.tutorPayRate).toFixed(2)}</td>
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
