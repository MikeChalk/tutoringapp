import { prisma } from "@/lib/db"
import { requireAuth, isTutor, getTutorId } from "@/lib/auth-helpers"

const GRADE_LABELS: Record<string, string> = {
  ELEMENTARY: "Elementary",
  SEC1_2: "Sec 1-2",
  SEC3: "Sec 3",
  SEC4_5: "Sec 4-5",
  CEGEP: "CEGEP",
  UNI: "University",
}

const TENURE_LABELS: Record<string, string> = {
  "1ST_YEAR": "Year 1",
  "2ND_YEAR": "Year 2",
  "3RD_YEAR": "Year 3",
}

const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ON_HOLD: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  FINISHED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

export default async function HoursPage() {
  const session = await requireAuth()
  const tutor = isTutor(session.user.role)

  let tutorId: string | null = null
  let currentTutor: { id: string; tenure: string; user: { name: string } } | null = null

  if (tutor) {
    tutorId = await getTutorId(session.user.id, session.user.email)
    currentTutor = tutorId
      ? await prisma.tutor.findUnique({
          where: { id: tutorId },
          include: { user: { select: { name: true } } },
        })
      : null
  }

  const [hourLogs, projects, tutors] = await Promise.all([
    prisma.hourLog.findMany({
      where: tutor && tutorId ? { tutorId } : {},
      include: {
        tutor: { include: { user: { select: { name: true } } } },
        project: { select: { name: true, status: true, client: { select: { user: { select: { name: true } } } } } },
      },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.project.findMany({
      where: tutor && tutorId ? { projectTutors: { some: { tutorId } } } : {},
      include: {
        client: { select: { user: { select: { name: true } } } },
        projectTutors: { include: { tutor: { include: { user: { select: { name: true, id: true } } } } } },
      },
    }),
    tutor
      ? (tutorId
          ? prisma.tutor.findMany({
              where: { id: tutorId, isActive: true },
              include: { user: { select: { name: true } } },
            })
          : Promise.resolve([])
        )
      : prisma.tutor.findMany({
          where: { isActive: true },
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
            <p className="text-sm text-zinc-500">No hours logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Date</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Tutor</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Project</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Client</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Mode</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Hrs</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Bill $/hr</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Pay $/hr</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {hourLogs.map((log) => (
                    <tr key={log.id} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/30">
                      <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">
                        {new Date(log.date).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">{log.tutor.user.name}</td>
                      <td className="px-2 py-2">
                        <span className="text-zinc-900 dark:text-zinc-100">{log.project.name}</span>
                        <span className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ml-2 ${STATUS_COLORS[log.project.status] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}>
                          {log.project.status}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">{log.project.client.user.name}</td>
                      <td className="px-2 py-2">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          log.mode === "ONLINE" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
                        }`}>
                          {log.mode === "ONLINE" ? "Online" : "In Person"}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right text-zinc-900 dark:text-zinc-100">{log.hours}</td>
                      <td className="px-2 py-2 text-right text-zinc-600 dark:text-zinc-400">${log.billingRate.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right text-zinc-600 dark:text-zinc-400">${log.tutorPayRate.toFixed(2)}</td>
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

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Log New Hours</h3>
          <form action="/api/hours" method="POST" className="flex flex-col gap-4" id="hourLogForm">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Project (Student)</label>
              <select name="projectId" required id="projectSelect"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select student</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} data-grade={p.gradeLevel}>
                    {p.name} — {p.client.user.name} ({GRADE_LABELS[p.gradeLevel] || p.gradeLevel})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tutor</label>
              <select name="tutorId" required id="tutorSelect"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select tutor</option>
                {tutors.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    data-tenure={t.tenure}
                    selected={tutor && t.id === tutorId ? true : undefined}
                  >
                    {t.user.name} ({TENURE_LABELS[t.tenure] || t.tenure})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Mode</label>
              <select name="mode" required id="modeSelect"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="IN_PERSON">In Person</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-500">Billing Rate:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100" id="billingRateDisplay">--</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Tutor Pay Rate:</span>
                <span className="font-medium text-green-600 dark:text-green-400" id="payRateDisplay">--</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Date</label>
              <input type="date" name="date" required defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Hours</label>
              <input type="number" name="hours" required min="0.25" step="0.25" defaultValue="1"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
              <textarea name="description" rows={2}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit"
              className="w-full rounded-lg bg-zinc-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity">
              Log Hours
            </button>
          </form>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        const projectSelect = document.getElementById('projectSelect');
        const tutorSelect = document.getElementById('tutorSelect');
        const modeSelect = document.getElementById('modeSelect');
        const billingDisplay = document.getElementById('billingRateDisplay');
        const payDisplay = document.getElementById('payRateDisplay');

        async function updateRates() {
          const projectOption = projectSelect?.selectedOptions[0];
          const tutorOption = tutorSelect?.selectedOptions[0];
          const grade = projectOption?.dataset.grade;
          const mode = modeSelect?.value;
          const tenure = tutorOption?.dataset.tenure;

          if (!grade || !mode) {
            billingDisplay.textContent = '--';
            payDisplay.textContent = '--';
            return;
          }

          const params = new URLSearchParams({ gradeLevel: grade, mode });
          if (tenure) params.set('tenure', tenure);

          const res = await fetch('/api/rates?' + params.toString());
          const data = await res.json();
          billingDisplay.textContent = data.billingRate != null ? '$' + data.billingRate.toFixed(2) + '/hr' : '--';
          payDisplay.textContent = data.payRate != null ? '$' + data.payRate.toFixed(2) + '/hr' : '--';
        }

        projectSelect?.addEventListener('change', updateRates);
        tutorSelect?.addEventListener('change', updateRates);
        modeSelect?.addEventListener('change', updateRates);
        updateRates();
      `}} />
    </div>
  )
}
