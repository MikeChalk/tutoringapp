import { prisma } from "@/lib/db"
import { requireAuth, isTutor, getTutorId, isSuperAdmin, isAdmin, isCityAdmin, getActiveCityId } from "@/lib/auth-helpers"
import { GRADE_LABELS, TENURE_LABELS, STATUS_COLORS, PRIVATE_TUTORING_CATEGORIES, PROGRAM_SUPERVISOR_CATEGORIES } from "@/lib/constants"
import { CityFilter } from "@/components/city-filter"
import { DeleteHourButton } from "@/components/delete-hour-button"
import EditHourLog from "@/components/edit-hour-log"
import Script from "next/script"

export default async function HoursPage(props: { searchParams: Promise<{ city?: string }> }) {
  const session = await requireAuth()
  const tutor = isTutor(session.user.role)
  const superAdmin = isSuperAdmin(session.user.role)
  const admin = isAdmin(session.user.role)

  const { city: cityParam } = await props.searchParams
  const selectedCity = cityParam || "all"
  const cityAdminId = isCityAdmin(session.user.role) ? await getActiveCityId(session.user.role, session.user.id) : null
  const effectiveCityId = cityAdminId || (superAdmin && selectedCity !== "all" ? selectedCity : null)

  let tutorId: string | null = null

  if (tutor) {
    tutorId = await getTutorId(session.user.id, session.user.email)
  }

  const [hourLogs, projects, tutors] = await Promise.all([
    prisma.hourLog.findMany({
      where: tutor && tutorId
        ? { tutorId }
        : effectiveCityId
          ? { project: { cityId: effectiveCityId } }
          : {},
      include: {
        tutor: { include: { user: { select: { name: true } } } },
        project: { select: { name: true, gradeLevel: true, status: true, client: { select: { user: { select: { name: true } } } }, city: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.project.findMany({
      where: tutor && tutorId
        ? { projectTutors: { some: { tutorId } } }
        : effectiveCityId
          ? { cityId: effectiveCityId }
          : {},
      include: {
        client: { select: { user: { select: { name: true } }, type: true } },
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
          where: { isActive: true, ...(effectiveCityId ? { user: { cityId: effectiveCityId } } : {}) },
          include: { user: { select: { name: true } } },
        }),
  ])

  let adminTutorId: string | null = null
  if (admin) {
    let adminTutor = await prisma.tutor.findUnique({ where: { userId: session.user.id } })
    if (!adminTutor) {
      adminTutor = await prisma.tutor.create({
        data: { userId: session.user.id, tenure: "1ST_YEAR", isActive: true, onboarded: false, onboardingStep: 0 },
      })
    } else if (!adminTutor.isActive) {
      await prisma.tutor.update({ where: { id: adminTutor.id }, data: { isActive: true } })
    }
    adminTutorId = adminTutor.id
    const idx = tutors.findIndex(t => t.id === adminTutorId)
    if (idx > 0) {
      const [me] = tutors.splice(idx, 1)
      tutors.unshift(me)
    } else if (idx === -1) {
      const adminUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } })
      tutors.unshift({ id: adminTutorId, user: { name: adminUser?.name || "Me (Admin)" }, tenure: "1ST_YEAR" } as typeof tutors[0])
    }
  }

  let contractRatesJson = "{}"
  let tutorContractsJson = "{}"
  let billingRatesJson = "{}"
  if (tutor && tutorId) {
    const contract = await prisma.contract.findFirst({ where: { tutorId, status: "ACTIVE" }, select: { rates: true } })
    if (contract?.rates) contractRatesJson = contract.rates
  } else if (admin) {
    const [allContracts, allBillingRates] = await Promise.all([
      prisma.contract.findMany({
        where: { status: "ACTIVE", tutorId: { in: tutors.map(t => t.id) } },
        select: { tutorId: true, rates: true },
      }),
      prisma.billingRate.findMany({ select: { gradeLevel: true, mode: true, projectType: true, rate: true } }),
    ])
    const tc: Record<string, unknown> = {}
    for (const c of allContracts) {
      if (c.rates) {
        try { tc[c.tutorId] = JSON.parse(c.rates) } catch { tc[c.tutorId] = {} }
      }
    }
    tutorContractsJson = JSON.stringify(tc)
    const brMap: Record<string, number> = {}
    for (const r of allBillingRates) {
      brMap[`${r.gradeLevel}|${r.mode}|${r.projectType}`] = r.rate
    }
    billingRatesJson = JSON.stringify(brMap)
  }

  const tutorProjectsMap: Record<string, string[]> = {}
  for (const p of projects) {
    for (const pt of p.projectTutors) {
      const tid = pt.tutorId
      if (!tutorProjectsMap[tid]) tutorProjectsMap[tid] = []
      tutorProjectsMap[tid].push(p.id)
    }
  }
  const assignJson = JSON.stringify(tutorProjectsMap)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Log Hours</h2>
        <div className="flex items-center gap-3">
          <a href="/api/export?type=hours" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Export CSV</a>
          {superAdmin && <CityFilter selected={selectedCity} />}
        </div>
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
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">City</th>
                    <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Mode</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Hrs</th>
                    {!tutor && <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Bill $/hr</th>}
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Pay $/hr</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Total Pay</th>
                    {(admin || tutor) && <th className="text-center px-2 py-2 text-xs font-medium text-zinc-500">Actions</th>}
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
                      <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">{log.project.client?.user.name || "Other"}</td>
                      <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">{log.project.city?.name || "-"}</td>
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
                      {admin && (
                        <td className="px-2 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <EditHourLog
                              id={log.id}
                              hours={log.hours}
                              date={new Date(log.date).toISOString().split("T")[0]}
                              mode={log.mode}
                              billingRate={log.billingRate}
                              tutorPayRate={log.tutorPayRate}
                              description={log.description}
                            />
                            <DeleteHourButton id={log.id} />
                          </div>
                        </td>
                      )}
                      {tutor && (
                        <td className="px-2 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <EditHourLog
                              id={log.id}
                              hours={log.hours}
                              date={new Date(log.date).toISOString().split("T")[0]}
                              mode={log.mode}
                              billingRate={log.billingRate}
                              tutorPayRate={log.tutorPayRate}
                              description={log.description}
                            />
                            <DeleteHourButton id={log.id} />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Log New Hours</h3>
          <form action="/api/hours" method="POST" className="flex flex-col gap-4" id="hourLogForm" data-confirm="Submit this time log?">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Team Member</label>
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
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Project Type</label>
              <select id="projectTypeSelect"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="STUDENT">Private Tutoring</option>
                <option value="STUDY_HALL">Other Projects</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Project</label>
              <select name="projectId" required id="projectSelect"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} data-grade={p.gradeLevel} data-type={p.projectType || "STUDENT"}
                    data-client-type={p.client?.type || ""}
                    data-tutors={p.projectTutors.map(pt => pt.tutorId).join(",")}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div id="modeField">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Mode</label>
              <select name="mode" required id="modeSelect"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="IN_PERSON">In Person</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
            <div id="categoryGroup">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
              <select name="category" id="categorySelect"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">--</option>
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

      <Script id="hourLogFormScript" strategy="afterInteractive">{`
        (function() {
          var ASSIGN = ${assignJson};
          var CONTRACT_RATES = ${contractRatesJson};
          var TUTOR_CONTRACTS = ${tutorContractsJson};
          var BILLING_RATES = ${billingRatesJson};
          var ADMIN_TUTOR_ID = ${adminTutorId ? JSON.stringify(adminTutorId) : "null"};
          var TUTORING_CATS = ${JSON.stringify(PRIVATE_TUTORING_CATEGORIES)};
          var SUPERVISOR_CATS = ${JSON.stringify(PROGRAM_SUPERVISOR_CATEGORIES)};
          var CAT_LABELS = ${JSON.stringify(GRADE_LABELS)};
          var IS_TUTOR = ${tutor};

          var projectSelect = document.getElementById('projectSelect');
          var tutorSelect = document.getElementById('tutorSelect');
          var modeSelect = document.getElementById('modeSelect');
          var typeSelect = document.getElementById('projectTypeSelect');
          var categorySelect = document.getElementById('categorySelect');
          var billingInput = document.getElementById('billingRateInput');
          var payRateInput = document.getElementById('payRateInput');
          var payRateDisplay = document.getElementById('payRateDisplay');

          function getContractRate(ratesObj, category, mode) {
            if (!ratesObj || !category) return undefined;
            var key = category + '|' + mode;
            if (ratesObj[key] !== undefined) return ratesObj[key];
            return ratesObj[category];
          }

          function populateCategories() {
            if (!categorySelect) return;
            var type = typeSelect && typeSelect.value;
            var cats = type === 'STUDY_HALL' ? SUPERVISOR_CATS : TUTORING_CATS;
            var current = categorySelect.value;
            categorySelect.innerHTML = '<option value="">--</option>';
            for (var i = 0; i < cats.length; i++) {
              var label = CAT_LABELS[cats[i]] || cats[i];
              var sel = current === cats[i] ? ' selected' : '';
              categorySelect.innerHTML += '<option value="' + cats[i] + '"' + sel + '>' + label + '</option>';
            }
          }

          function autoSelectCategory() {
            if (!projectSelect || !categorySelect) return;
            var opt = projectSelect.selectedOptions[0];
            if (!opt || !opt.dataset.grade) return;
            if (categorySelect.dataset.manual === '1') return;
            var grade = opt.dataset.grade;
            var found = false;
            for (var i = 0; i < categorySelect.options.length; i++) {
              if (categorySelect.options[i].value === grade) { found = true; break; }
            }
            if (found) {
              categorySelect.value = grade;
            } else if (opt.dataset.type === 'STUDY_HALL') {
              categorySelect.value = 'STUDY_HALL_TUTOR';
            }
          }

          function suggestRates() {
            autoSelectCategory();
            var projectOpt = projectSelect && projectSelect.selectedOptions[0];
            var hasProject = projectOpt && projectOpt.value;
            var grade = projectOpt && projectOpt.dataset.grade;
            var projectType = projectOpt && projectOpt.dataset.type || 'STUDENT';
            var mode = modeSelect && modeSelect.value || 'IN_PERSON';
            var category = categorySelect && categorySelect.value;
            var tutorId = tutorSelect && tutorSelect.value;
            var lookupGrade = category || grade;

            if (billingInput && hasProject && lookupGrade && mode && projectType) {
              var brKey = lookupGrade + '|' + mode + '|' + projectType;
              var br = BILLING_RATES[brKey];
              if (br !== undefined) billingInput.value = br;
            }

            if (tutorId && TUTOR_CONTRACTS[tutorId] && hasProject) {
              var rates = TUTOR_CONTRACTS[tutorId];
              var cr = getContractRate(rates, lookupGrade, mode);
              if (cr !== undefined && payRateInput) payRateInput.value = cr;
            }

            if (IS_TUTOR && payRateDisplay && hasProject && category) {
              var cr = getContractRate(CONTRACT_RATES, category, mode);
              payRateDisplay.textContent = cr !== undefined ? '$' + cr + '/hr' : '--';
            }
          }

          function filterProjects() {
            var type = typeSelect && typeSelect.value;
            var modeField = document.getElementById('modeField');
            var modeSelectEl = document.getElementById('modeSelect');
            if (modeField && modeSelectEl) {
              if (type === 'STUDY_HALL') {
                modeField.style.display = 'none';
                modeSelectEl.value = 'IN_PERSON';
              } else {
                modeField.style.display = '';
              }
            }
            populateCategories();
            if (categorySelect) categorySelect.dataset.manual = '0';
            var tutorId = tutorSelect && tutorSelect.value;
            var isAdminTutor = ADMIN_TUTOR_ID && tutorId === ADMIN_TUTOR_ID;
            var assignedProjects = tutorId && !isAdminTutor ? (ASSIGN[tutorId] || []) : null;
            if (!projectSelect) return;
            var opts = projectSelect.options;
            var hasVisible = false;
            for (var i = 0; i < opts.length; i++) {
              if (opts[i].value === '') { opts[i].hidden = false; continue; }
              var show = true;
              if (type && opts[i].dataset.type !== type) show = false;
              if (show && assignedProjects && assignedProjects.indexOf(opts[i].value) === -1) show = false;
              opts[i].hidden = !show;
              if (show && !hasVisible) { hasVisible = true; opts[i].selected = true; }
            }
            if (!hasVisible) projectSelect.value = '';
            suggestRates();
          }

          if (typeSelect) typeSelect.addEventListener('change', filterProjects);
          if (tutorSelect) tutorSelect.addEventListener('change', function() {
            if (categorySelect) { categorySelect.dataset.manual = '0'; categorySelect.value = ''; }
            if (billingInput) billingInput.value = '';
            if (payRateInput) payRateInput.value = '';
            filterProjects();
          });
          if (projectSelect) projectSelect.addEventListener('change', function() {
            if (categorySelect) categorySelect.dataset.manual = '0';
            suggestRates();
          });
          if (modeSelect) modeSelect.addEventListener('change', suggestRates);
          if (categorySelect) {
            categorySelect.addEventListener('change', function() {
              categorySelect.dataset.manual = '1';
              var val = categorySelect.value;
              if (IS_TUTOR && payRateDisplay) {
                var mode = modeSelect && modeSelect.value || 'IN_PERSON';
                var cr = getContractRate(CONTRACT_RATES, val, mode);
                payRateDisplay.textContent = cr !== undefined ? '$' + cr + '/hr' : '--';
              }
              suggestRates();
            });
          }
          filterProjects();
        })();
      `}</Script>
    </div>
  )
}
