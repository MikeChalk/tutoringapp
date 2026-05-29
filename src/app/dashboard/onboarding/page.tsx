import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isSuperAdmin, isCityAdmin, getActiveCityId } from "@/lib/auth-helpers"
import { CityFilter } from "@/components/city-filter"
import { GRADE_LABELS } from "@/lib/constants"
import { redirect } from "next/navigation"

const ONBOARDING_STEPS = [
  "Email sent to tutor",
  "Contract signed",
  "Platform onboarding complete",
  "Contact sent to client",
]

export default async function OnboardingPage(props: { searchParams: Promise<{ created?: string; pw?: string; city?: string }> }) {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const { created, pw, city: cityParam } = await props.searchParams
  const selectedCity = cityParam || "all"
  const superAdmin = isSuperAdmin(session.user.role)
  const cityAdminId = isCityAdmin(session.user.role) ? await getActiveCityId(session.user.role, session.user.id) : null
  const effectiveCityId = cityAdminId || (superAdmin && selectedCity !== "all" ? selectedCity : null)

  const today = new Date()
  const july1ThisYear = new Date(today.getFullYear(), 6, 1)
  const nextJuly1 = today < july1ThisYear ? july1ThisYear : new Date(today.getFullYear() + 1, 6, 1)
  const endDateDefault = nextJuly1.toISOString().split("T")[0]

  const pendingTutors = await prisma.tutor.findMany({
    where: { onboarded: false, isActive: true, ...(effectiveCityId ? { user: { cityId: effectiveCityId } } : {}) },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  })

  const templates = await prisma.contractTemplate.findMany({
    orderBy: [{ type: "asc" }, { yearLevel: "asc" }],
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Onboarding</h2>
        <div className="flex items-center gap-4">{superAdmin && <CityFilter selected={selectedCity} />}<a href="#quickAddSection" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">+ Add Team Member</a></div>
      </div>

      {created && pw && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            Team member created: <strong>{created}</strong>
          </p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1">
            Temporary password: <code className="bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded text-xs font-mono">{pw}</code>
            — share this with them to sign in.
          </p>
        </div>
      )}

      <div id="quickAddSection" className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Add Team Member Directly</h3>
        <form action="/api/onboarding" method="POST" className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Name</label>
            <input type="text" name="name" required
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Email</label>
            <input type="email" name="email" required
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Contract Type</label>
            <select name="contractType" required
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="PRIVATE_TUTORING">Private Tutoring</option>
              <option value="PROGRAM_SUPERVISOR">Program Supervisor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Year Level</label>
            <select name="yearLevel" required
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="1ST_YEAR">Year 1</option>
              <option value="2ND_YEAR">Year 2</option>
              <option value="3RD_YEAR">Year 3</option>
            </select>
          </div>
          {templates.length > 0 && (
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Template (optional)</label>
              <select name="templateId"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">No template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          <button type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            Create & Onboard
          </button>
          <div className="col-span-full">
            <label className="block text-xs text-zinc-500 mb-1">Grade Levels (comma separated, e.g. ELEMENTARY,SEC1_2)</label>
            <input type="text" name="gradeLevels" placeholder="ELEMENTARY, SEC1_2, SEC3, SEC4_5, CEGEP, UNI"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-zinc-400 mt-1">Options: {Object.entries(GRADE_LABELS).filter(([k]) => !["STUDY_HALL","PROGRAM_SUPERVISOR"].includes(k)).map(([,v]) => v).join(", ")}</p>
          </div>
        </form>
      </div>

      {pendingTutors.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
          <p className="text-zinc-500">All tutors are onboarded.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingTutors.map((tutor) => (
            <div key={tutor.id} className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{tutor.user.name}</p>
                  <p className="text-sm text-zinc-500">{tutor.user.email}</p>
                  <p className="text-xs text-zinc-400 mt-1">Joined {new Date(tutor.createdAt).toLocaleDateString()}</p>
                </div>
                <form action="/api/onboarding" method="POST" className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="tutorId" value={tutor.id} />
                  <select name="contractType" required
                    className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="PRIVATE_TUTORING">Private Tutoring</option>
                    <option value="PROGRAM_SUPERVISOR">Program Supervisor</option>
                  </select>
                  <select name="yearLevel" required
                    className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="1ST_YEAR">Year 1</option>
                    <option value="2ND_YEAR">Year 2</option>
                    <option value="3RD_YEAR">Year 3</option>
                  </select>
                  <input type="date" name="startDate" required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input type="date" name="endDate" required
                    defaultValue={endDateDefault}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <input type="text" name="gradeLevels" placeholder="Grade levels (e.g. ELEMENTARY,SEC1_2)"
                    defaultValue={tutor.gradeLevels || ""}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  {templates.length > 0 && (
                    <select name="templateId"
                      className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">No template</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}
                  <button type="submit"
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors">
                    Onboard
                  </button>
                </form>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase mb-2">Progress</p>
                <div className="flex gap-2">
                  {ONBOARDING_STEPS.map((step, i) => {
                    const done = tutor.onboardingStep > i
                    const current = tutor.onboardingStep === i
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          done ? "bg-green-500 text-white"
                          : current ? "bg-blue-500 text-white"
                          : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400"
                        }`}>
                          {done ? "✓" : i + 1}
                        </div>
                        <span className={`text-xs ${current ? "text-blue-600 dark:text-blue-400 font-medium" : "text-zinc-400"}`}>
                          {step}
                        </span>
                        {i < ONBOARDING_STEPS.length - 1 && (
                          <div className={`w-4 h-0.5 ${done ? "bg-green-300" : "bg-zinc-200 dark:bg-zinc-700"}`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
