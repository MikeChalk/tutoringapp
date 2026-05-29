import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isSuperAdmin, isCityAdmin, getActiveCityId } from "@/lib/auth-helpers"
import { CityFilter } from "@/components/city-filter"
import { redirect } from "next/navigation"
import Link from "next/link"

const ONBOARDING_STEPS = [
  "Email sent to tutor",
  "Contract signed",
  "Email sent to parent",
  "Project created",
  "Tutor assigned to project",
  "Tutor contacts client",
  "Platform onboarding complete",
]

const ADMIN_ADVANCE_STEPS = new Set([0, 2, 3, 4])

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

  const cityFilter = effectiveCityId ? { user: { cityId: effectiveCityId } } : {}

  const pendingTutors = await prisma.tutor.findMany({
    where: { isActive: true, onboardingStep: { lt: 6 }, ...cityFilter },
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
          </p>
        </div>
      )}

      <div id="quickAddSection" className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Add Team Member Directly</h3>
        <form action="/api/onboarding" method="POST" className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div><label className="block text-xs text-zinc-500 mb-1">Name</label><input type="text" name="name" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-zinc-500 mb-1">Email</label><input type="email" name="email" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Contract Type</label>
            <select name="contractType" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="PRIVATE_TUTORING">Private Tutoring</option>
              <option value="PROGRAM_SUPERVISOR">Program Supervisor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Year Level</label>
            <select name="yearLevel" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="1ST_YEAR">Year 1</option><option value="2ND_YEAR">Year 2</option><option value="3RD_YEAR">Year 3</option>
            </select>
          </div>
          {templates.length > 0 && (
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Template (optional)</label>
              <select name="templateId" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">No template</option>
                {templates.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
              </select>
            </div>
          )}
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Create & Start Onboarding</button>
          <div className="col-span-full">
            <label className="block text-xs text-zinc-500 mb-1">Grade Levels</label>
            <input type="text" name="gradeLevels" placeholder="ELEMENTARY, SEC1_2, SEC3, SEC4_5, CEGEP, UNI" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </form>
      </div>

      {pendingTutors.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
          <p className="text-zinc-500">All tutors are fully onboarded.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingTutors.map((tutor) => {
            const step = tutor.onboardingStep
            const needsContract = step === 0
            const displayStep = step + 1

            return (
              <div key={tutor.id} className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/tutors/${tutor.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{tutor.user.name}</Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${step >= 1 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                        Step {displayStep} of {ONBOARDING_STEPS.length}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500">{tutor.user.email}</p>
                    <p className="text-xs text-zinc-400 mt-1">Joined {new Date(tutor.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-start gap-2">
                    {needsContract ? (
                      <form action="/api/onboarding" method="POST" className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 space-y-2 max-w-md">
                        <input type="hidden" name="tutorId" value={tutor.id} />
                        <div className="flex flex-wrap gap-1.5">
                          <select name="contractType" required className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="PRIVATE_TUTORING">Private Tutoring</option>
                            <option value="PROGRAM_SUPERVISOR">Program Supervisor</option>
                          </select>
                          <select name="yearLevel" required className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="1ST_YEAR">Year 1</option><option value="2ND_YEAR">Year 2</option><option value="3RD_YEAR">Year 3</option>
                          </select>
                          <input type="date" name="startDate" required defaultValue={new Date().toISOString().split("T")[0]} className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          <input type="date" name="endDate" required defaultValue={endDateDefault} className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <input type="text" name="gradeLevels" placeholder="Grade levels" defaultValue={tutor.gradeLevels || ""} className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        {templates.length > 0 && (
                          <select name="templateId" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">No template</option>
                            {templates.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                          </select>
                        )}
                        <button type="submit" className="w-full rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors">Create Contract & Send Email</button>
                      </form>
                    ) : ADMIN_ADVANCE_STEPS.has(step) ? (
                      <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 space-y-2 max-w-md">
                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          {step === 0 ? "Send welcome email to tutor" :
                           step === 2 ? "Notify parent of tutor match" :
                           step === 3 ? "Project has been created" :
                           "Tutor has been assigned to project"}
                        </p>
                        <form action="/api/onboarding" method="POST" className="space-y-2">
                          <input type="hidden" name="_action" value="advance" />
                          <input type="hidden" name="tutorId" value={tutor.id} />
                          {step === 0 && (
                            <textarea name="emailMessage" rows={3} placeholder="Custom welcome message for the tutor..."
                              className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              defaultValue={`Welcome to J.A.S.S.! We're excited to have you on the team.\n\nPlease log in to the platform and sign your contract to get started.`} />
                          )}
                          {step === 2 && (
                            <>
                              <input type="text" name="parentEmail" placeholder="Parent email" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <input type="text" name="parentName" placeholder="Parent name" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <textarea name="parentMessage" rows={2} placeholder="Custom message for the parent..."
                                className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                defaultValue={`We've matched you with ${tutor.user.name}. They will be reaching out to you shortly to arrange the first session.`} />
                            </>
                          )}
                          <button type="submit" className="w-full rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
                            {step === 0 ? "Send Email & Advance" :
                             step === 2 ? "Send Parent Email & Advance" :
                             `Advance to "${ONBOARDING_STEPS[step + 1]}"`}
                          </button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">
                        {step === 1 ? "Waiting for tutor to sign contract" :
                         step === 5 ? "Waiting for tutor to contact client" :
                         "Waiting for tutor to complete onboarding"}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase mb-2">Progress</p>
                  <div className="flex flex-wrap gap-2">
                    {ONBOARDING_STEPS.map((label, i) => {
                      const done = step > i
                      const current = step === i
                      return (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            done ? "bg-green-500 text-white" : current ? "bg-blue-500 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400"
                          }`}>
                            {done ? "✓" : i + 1}
                          </div>
                          <span className={`text-[11px] ${current ? "text-blue-600 dark:text-blue-400 font-medium" : "text-zinc-400"}`}>
                            {label}
                          </span>
                          {i < ONBOARDING_STEPS.length - 1 && (
                            <div className={`w-3 h-0.5 ${done ? "bg-green-300" : "bg-zinc-200 dark:bg-zinc-700"}`} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
