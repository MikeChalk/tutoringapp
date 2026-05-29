import { prisma } from "@/lib/db"
import { requireAuth, isTutor, getTutorId } from "@/lib/auth-helpers"
import { GRADE_LABELS, TENURE_LABELS, STATUS_COLORS } from "@/lib/constants"

export default async function HoursPage() {
  const session = await requireAuth()
  const tutor = isTutor(session.user.role)

  let tutorId: string | null = null

  if (tutor) {
    tutorId = await getTutorId(session.user.id, session.user.email)
  }

  const [hourLogs, projects, tutors, billingRates, payScales] = await Promise.all([
    prisma.hourLog.findMany({
      where: tutor && tutorId ? { tutorId } : {},
      include: {
        tutor: { include: { user: { select: { name: true } } } },
        project: { select: { name: true, gradeLevel: true, status: true, client: { select: { user: { select: { name: true } } } } } },
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
    prisma.billingRate.findMany(),
    prisma.payScale.findMany(),
  ])

  const ratesJson = JSON.stringify({
    billing: billingRates.map(r => ({ g: r.gradeLevel, m: r.mode, r: r.rate })),
    pay: payScales.map(s => ({ t: s.tenure, g: s.gradeLevel, m: s.mode, r: s.rate })),
  })

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
                    {!tutor && <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Tutor</th>}
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Student</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Client</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Mode</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Hrs</th>
                    {!tutor && <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Bill $/hr</th>}
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Pay $/hr</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Total Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                  {hourLogs.map((log) => (
                    <tr key={log.id} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/30">
                      <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">
                        {new Date(log.date).toLocaleDateString()}
                      </td>
                      {!tutor && <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">{log.tutor.user.name}</td>}
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
                      {!tutor && <td className="px-2 py-2 text-right text-zinc-600 dark:text-zinc-400">${log.billingRate.toFixed(2)}</td>}
                      <td className="px-2 py-2 text-right font-medium text-green-600 dark:text-green-400">${log.tutorPayRate.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right font-medium text-green-600 dark:text-green-400">${(log.hours * log.tutorPayRate).toFixed(2)}</td>
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
              <select name="tutorId" required id="tutorSelect" defaultValue={tutorId ?? ""}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="" disabled={!!tutorId}>Select tutor</option>
                {tutors.map((t) => (
                  <option key={t.id} value={t.id} data-tenure={t.tenure}>
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
              {!tutor ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Billing Rate ($/hr)</label>
                      <input type="number" name="billingRate" id="billingRateInput" min="0" step="0.01"
                        className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 mb-1">Tutor Pay Rate ($/hr)</label>
                      <input type="number" name="tutorPayRate" id="payRateInput" min="0" step="0.01"
                        className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400">Leave blank to auto-calculate from rate tables.</p>
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Your Pay Rate:</span>
                  <span className="font-medium text-green-600 dark:text-green-400" id="payRateDisplay">--</span>
                </div>
              )}
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
        (function() {
          var RATES = ${ratesJson};
          var projectSelect = document.getElementById('projectSelect');
          var tutorSelect = document.getElementById('tutorSelect');
          var modeSelect = document.getElementById('modeSelect');
          var billingDisplay = document.getElementById('billingRateDisplay');
          var payDisplay = document.getElementById('payRateDisplay');

          function updateRates() {
            var grade = projectSelect && projectSelect.value ? (projectSelect.querySelector('option[value="' + projectSelect.value.replace(/"/g, '\\"') + '"]') || {}).dataset.grade : null;
            var mode = modeSelect && modeSelect.value;
            var tenure = tutorSelect && tutorSelect.value ? (tutorSelect.querySelector('option[value="' + tutorSelect.value.replace(/"/g, '\\"') + '"]') || {}).dataset.tenure : null;

            if (!grade || !mode) {
              if (billingDisplay) billingDisplay.textContent = '--';
              if (payDisplay) payDisplay.textContent = '--';
              return;
            }

            var billing = null;
            var pay = null;
            for (var i = 0; i < RATES.billing.length; i++) {
              if (RATES.billing[i].g === grade && RATES.billing[i].m === mode) { billing = RATES.billing[i].r; break; }
            }
            if (tenure) {
              for (var j = 0; j < RATES.pay.length; j++) {
                if (RATES.pay[j].t === tenure && RATES.pay[j].g === grade && RATES.pay[j].m === mode) { pay = RATES.pay[j].r; break; }
              }
            }

          if (billingDisplay) billingDisplay.textContent = billing != null ? '$' + billing.toFixed(2) + '/hr' : '--';
          if (payDisplay) payDisplay.textContent = pay != null ? '$' + pay.toFixed(2) + '/hr' : '--';

          var billingInput = document.getElementById('billingRateInput');
          var payInput = document.getElementById('payRateInput');
          if (billingInput && !billingInput.value) billingInput.placeholder = billing != null ? billing.toFixed(2) : '';
          if (payInput && !payInput.value) payInput.placeholder = pay != null ? pay.toFixed(2) : '';
        }

          if (projectSelect) projectSelect.addEventListener('change', updateRates);
          if (tutorSelect) tutorSelect.addEventListener('change', updateRates);
          if (modeSelect) modeSelect.addEventListener('change', updateRates);
          updateRates();
        })();
      `}} />
    </div>
  )
}
