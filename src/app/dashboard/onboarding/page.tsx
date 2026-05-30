import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isSuperAdmin, isCityAdmin, isTutor, getTutorId, getActiveCityId } from "@/lib/auth-helpers"
import { CityFilter } from "@/components/city-filter"
import { GRADE_LABELS, ONBOARDING_STEPS } from "@/lib/constants"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AddTutorForm } from "@/components/add-tutor-form"

const ADMIN_ADVANCE_STEPS = new Set([2, 3, 4])

export default async function OnboardingPage(props: { searchParams: Promise<{ created?: string; pw?: string; city?: string }> }) {
  const session = await requireAuth()
  const admin = isAdmin(session.user.role)
  const tutor = isTutor(session.user.role)
  if (!admin && !tutor) redirect("/dashboard")

  // Tutor view: show onboarding progress
  if (tutor) {
    const tutorId = await getTutorId(session.user.id, session.user.email)
    if (!tutorId) redirect("/dashboard")
    const tutorRecord = await prisma.tutor.findUnique({ where: { id: tutorId } })
    if (!tutorRecord) redirect("/dashboard")
    const step = tutorRecord.onboardingStep

    return (
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">My Onboarding</h2>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          {step >= 6 ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">&#10003;</div>
              <p className="text-lg font-medium text-green-600 dark:text-green-400">Onboarding Complete</p>
              <p className="text-sm text-zinc-500 mt-1">Platform onboarding complete.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {ONBOARDING_STEPS.map((label, i) => {
                const done = step > i
                const current = step === i
                return (
                  <div key={i} className="flex items-center gap-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${done ? "bg-green-500 text-white" : current ? "bg-blue-500 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400"}`}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span className={`text-[10px] ${current ? "text-blue-600 dark:text-blue-400 font-medium" : "text-zinc-400"}`}>{label}</span>
                    {i < ONBOARDING_STEPS.length - 1 && <div className={`w-2 h-0.5 ${done ? "bg-green-300" : "bg-zinc-200 dark:bg-zinc-700"}`} />}
                  </div>
                )
              })}
            </div>
          )}
          {step === 5 && (
            <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/10">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Contact Your Client</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">Reach out to your assigned client and mark this step complete.</p>
              <form action="/api/tutor/advance" method="POST">
                <input type="hidden" name="step" value="5" />
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700">I&apos;ve Contacted the Client</button>
              </form>
            </div>
          )}
        </div>
      </div>
    )
  }

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

  const clients = await prisma.client.findMany({
    where: effectiveCityId ? { user: { cityId: effectiveCityId } } : {},
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  })

  const cities = await prisma.city.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Onboarding</h2>
        <div className="flex items-center gap-4">{superAdmin && <CityFilter selected={selectedCity} />}</div>
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

      <AddTutorForm templates={templates} cities={cities} onboardFlow />

      {pendingTutors.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
          <p className="text-zinc-500">All tutors are fully onboarded.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingTutors.map((tutor) => {
            const step = tutor.onboardingStep
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
                    {step === 0 ? (
                      <div className="space-y-3 max-w-md">
                        <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 bg-blue-50/50 dark:bg-blue-900/10">
                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-2">Step 1: Send Welcome Email</p>
                          <form action="/api/onboarding" method="POST" className="space-y-2">
                            <input type="hidden" name="_action" value="advance" />
                            <input type="hidden" name="tutorId" value={tutor.id} />
                            <textarea name="emailMessage" rows={3} placeholder="Custom welcome message..."
                              className="w-full rounded border border-blue-200 dark:border-blue-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              defaultValue={`Welcome to J.A.S.S.! We're excited to have you on the team.\n\nPlease log in to the platform and sign your contract to get started.`} />
                            <button type="submit" className="w-full rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
                              Send Email & Advance to Step 2
                            </button>
                          </form>
                        </div>

                        <div className="border border-green-200 dark:border-green-800 rounded-lg p-3 bg-green-50/50 dark:bg-green-900/10">
                          <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">Step 2: Create Contract</p>
                          <form action="/api/onboarding" method="POST" className="space-y-2">
                            <input type="hidden" name="_action" value="contract" />
                            <input type="hidden" name="tutorId" value={tutor.id} />
                            <div className="flex flex-wrap gap-1.5">
                              <select name="contractType" required className="rounded border border-green-200 dark:border-green-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-green-500">
                                <option value="PRIVATE_TUTORING">Private Tutoring</option>
                                <option value="PROGRAM_SUPERVISOR">Program Supervisor</option>
                              </select>
                              <select name="yearLevel" required className="rounded border border-green-200 dark:border-green-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-green-500">
                                <option value="1ST_YEAR">Year 1</option><option value="2ND_YEAR">Year 2</option><option value="3RD_YEAR">Year 3</option>
                              </select>
                              <input type="date" name="startDate" required defaultValue={new Date().toISOString().split("T")[0]} className="rounded border border-green-200 dark:border-green-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-green-500" />
                              <input type="date" name="endDate" required defaultValue={endDateDefault} className="rounded border border-green-200 dark:border-green-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-green-500" />
                            </div>
                            <input type="text" name="gradeLevels" placeholder="Grade levels" defaultValue={tutor.gradeLevels || ""} className="w-full rounded border border-green-200 dark:border-green-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-green-500" />
                            {templates.length > 0 && (
                              <select name="templateId" className="w-full rounded border border-green-200 dark:border-green-700 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-green-500">
                                <option value="">No template</option>
                                {templates.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                              </select>
                            )}
                            <button type="submit" className="w-full rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors">Create Contract</button>
                          </form>
                        </div>
                      </div>
                    ) : ADMIN_ADVANCE_STEPS.has(step) ? (
                      <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 space-y-2 max-w-md">
                        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                            {step === 2 ? "Notify parent of tutor match" :
                             step === 3 ? "Create project for this tutor" :
                           "Tutor has been assigned to project"}
                        </p>
                        <form action="/api/onboarding" method="POST" className="space-y-2">
                          <input type="hidden" name="_action" value="advance" />
                          <input type="hidden" name="tutorId" value={tutor.id} />
                          {step === 2 && (
                            <>
                              <input type="text" name="parentEmail" placeholder="Parent email" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <input type="text" name="parentName" placeholder="Parent name" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <textarea name="parentMessage" rows={2} placeholder="Custom message for the parent..."
                                className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                defaultValue={`We've matched you with ${tutor.user.name}. They will be reaching out to you shortly to arrange the first session.`} />
                            </>
                          )}
                          {step === 3 && (
                            <>
                              <input type="text" name="projectName" required placeholder="Project name (e.g. Emma — Math)" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <select name="projectClientId" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                <option value="">No client</option>
                                {clients.map(c => (<option key={c.id} value={c.id}>{c.user.name}</option>))}
                              </select>
                              <select name="projectGradeLevel" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                {Object.entries(GRADE_LABELS).filter(([k]) => !["STUDY_HALL","PROGRAM_SUPERVISOR"].includes(k)).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                              </select>
                              <input type="text" name="projectSubjects" placeholder="Subjects" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </>
                          )}
                          <button type="submit" className="w-full rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
                            {step === 2 ? "Send Parent Email & Advance" :
                             step === 3 ? "Create Project & Advance" :
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
