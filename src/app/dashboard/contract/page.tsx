import { prisma } from "@/lib/db"
import { requireAuth, isTutor, getTutorId, isClient, getClientId } from "@/lib/auth-helpers"
import { CONTRACT_TYPE_LABELS, TENURE_LABELS } from "@/lib/constants"
import { redirect } from "next/navigation"
import Script from "next/script"

const TOS_TEXT = `J.A.S.S. Tutoring Services — Terms of Service

1. SERVICES
J.A.S.S. Tutoring ("J.A.S.S.", "we", "us") provides tutoring matching services connecting students with qualified tutors.

2. PAYMENT
Clients agree to pay for tutoring sessions at the rates established in their invoice. Payment is due within 30 days of invoice date unless otherwise specified.

3. CANCELLATION
Sessions cancelled with less than 24 hours notice may be subject to a cancellation fee at the tutor's discretion.

4. LIABILITY
J.A.S.S. acts as a matching service. While we vet all tutors, we are not liable for disputes between clients and tutors. Any concerns should be reported immediately.

5. PRIVACY
Client information is kept confidential and used solely for the purpose of providing tutoring services.

6. AGREEMENT
By accepting these terms, you agree to the conditions outlined above. These terms may be updated periodically.`

const ONBOARDING_STEPS = [
  "Email sent to tutor",
  "Contract signed",
  "Email sent to parent",
  "Project created",
  "Tutor assigned to project",
  "Tutor contacts client",
  "Platform onboarding complete",
]

export default async function ContractPage() {
  const session = await requireAuth()
  const isTutorRole = isTutor(session.user.role)
  const isClientRole = isClient(session.user.role)
  if (!isTutorRole && !isClientRole) redirect("/dashboard")

  // Client view: Terms of Service
  if (isClientRole) {
    const clientId = await getClientId(session.user.id, session.user.email)
    if (!clientId) redirect("/dashboard")
    const clientRecord = await prisma.client.findUnique({ where: { id: clientId } })
    if (!clientRecord) redirect("/dashboard")

    return (
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Terms of Service</h2>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
          <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed mb-6">{TOS_TEXT}</div>
          {clientRecord.tosAccepted ? (
            <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50/50 dark:bg-green-900/10">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Terms accepted on {clientRecord.tosAcceptedAt ? new Date(clientRecord.tosAcceptedAt).toLocaleDateString() : "N/A"}
              </p>
            </div>
          ) : (
            <form action="/api/terms/accept" method="POST">
              <button type="submit" className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors">
                Accept Terms of Service
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  const tutorId = await getTutorId(session.user.id, session.user.email)
  if (!tutorId) redirect("/dashboard")

  const tutorRecord = await prisma.tutor.findUnique({ where: { id: tutorId } })
  if (!tutorRecord) redirect("/dashboard")

  const step = tutorRecord.onboardingStep

  const contract = await prisma.contract.findFirst({
    where: { tutorId, status: "ACTIVE" },
    include: { tutor: { select: { tenure: true } } },
  })

  const payScales = contract
    ? await prisma.payScale.findMany({
        where: { tenure: contract.yearLevel },
        orderBy: [{ gradeLevel: "asc" }, { mode: "asc" }, { projectType: "asc" }],
      })
    : []

  const studentPayScales = payScales.filter(p => p.projectType === "STUDENT")
  const studyHallPayScales = payScales.filter(p => p.projectType === "STUDY_HALL")

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">My Contract</h2>

      {step < 6 && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Onboarding Progress</h3>
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

          {step === 5 && (
            <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/10">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Contact Your Client</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                Reach out to your assigned client to introduce yourself and arrange the first session. Once you've made contact, mark this step complete.
              </p>
              <form action="/api/tutor/advance" method="POST">
                <input type="hidden" name="step" value="5" />
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors">
                  I've Contacted the Client
                </button>
              </form>
            </div>
          )}

          {step === 6 && (
            <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50/50 dark:bg-green-900/10">
              <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Complete Platform Onboarding</p>
              <p className="text-xs text-green-600 dark:text-green-400 mb-2">
                Watch the onboarding video and connect your bank account to receive payments via Stripe.
              </p>

              {!tutorRecord.stripeConnectId && process.env.STRIPE_SECRET_KEY && (
                <div className="mb-3 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Connect Your Bank Account</p>
                  <p className="text-xs text-zinc-500 mb-2">Required to receive payments. You'll be redirected to Stripe to complete this.</p>
                  <form action="/api/stripe/connect" method="POST">
                    <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 transition-colors">
                      Connect Bank Account
                    </button>
                  </form>
                </div>
              )}
              {tutorRecord.stripeConnectId && (
                <p className="text-xs text-green-600 dark:text-green-400 mb-3">Bank account connected. Ready to receive payments.</p>
              )}

              <div className="aspect-video bg-zinc-900 rounded-lg mb-3 flex items-center justify-center" id="onboardingVideo">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-2 text-zinc-600" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  <p className="text-sm text-zinc-400">Onboarding Video</p>
                </div>
              </div>
              <Script id="videoScript" strategy="afterInteractive">{`
                (function() {
                  var container = document.getElementById('onboardingVideo');
                  var videoUrl = '${process.env.NEXT_PUBLIC_ONBOARDING_VIDEO_URL || ""}';
                  if (videoUrl && container) {
                    container.innerHTML = '<iframe src="' + videoUrl + '" class="w-full h-full rounded-lg" allowfullscreen allow="autoplay"></iframe>';
                  }
                })();
              `}</Script>
              <form action="/api/tutor/advance" method="POST">
                <input type="hidden" name="step" value="6" />
                <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 transition-colors">
                  I've Completed Onboarding
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {!contract ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400 mb-2">No active contract found.</p>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">Contact your admin to set up a contract.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Contract Details</h3>
            <dl className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-700/50">
                <dt className="text-zinc-500">Type</dt>
                <dd className="text-zinc-900 dark:text-zinc-100 font-medium">{CONTRACT_TYPE_LABELS[contract.type] || contract.type}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-700/50">
                <dt className="text-zinc-500">Year Level</dt>
                <dd className="text-zinc-900 dark:text-zinc-100 font-medium">{TENURE_LABELS[contract.yearLevel] || contract.yearLevel}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-700/50">
                <dt className="text-zinc-500">Start Date</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">{new Date(contract.startDate).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-700/50">
                <dt className="text-zinc-500">End Date</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">{new Date(contract.endDate).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-700/50">
                <dt className="text-zinc-500">Status</dt>
                <dd>
                  <span className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${contract.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>{contract.status}</span>
                  {contract.signed && <span className="ml-2 inline-flex text-xs font-medium rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Signed {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString() : ""}</span>}
                </dd>
              </div>
            </dl>
            {!contract.signed && (
              <form action="/api/contracts/sign" method="POST" className="mt-6">
                <button type="submit" className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors">Sign Contract</button>
              </form>
            )}
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Terms</h3>
            {contract.terms ? (
              <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{contract.terms}</div>
            ) : (
              <p className="text-sm text-zinc-500">No terms specified.</p>
            )}
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Private Tutoring Rates ({TENURE_LABELS[contract.yearLevel]})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {["ELEMENTARY", "SEC1_2", "SEC3", "SEC4_5", "CEGEP", "UNI"].map((grade) => {
                  const onlineRate = studentPayScales.find((p) => p.gradeLevel === grade && p.mode === "ONLINE")
                  const inPersonRate = studentPayScales.find((p) => p.gradeLevel === grade && p.mode === "IN_PERSON")
                  return (
                    <div key={grade} className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 text-center">
                      <p className="text-xs text-zinc-500 mb-2 font-medium">{grade.replace(/_/g, " ")}</p>
                      <div className="space-y-1">
                        <p className="text-xs text-purple-600 dark:text-purple-400">Online ${onlineRate?.rate?.toFixed(0) || "-"}</p>
                        <p className="text-xs text-cyan-600 dark:text-cyan-400">In-person ${inPersonRate?.rate?.toFixed(0) || "-"}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Study Hall Rates ({TENURE_LABELS[contract.yearLevel]})</h3>
              {studyHallPayScales.length === 0 ? (
                <p className="text-sm text-zinc-500">No study hall rates configured.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {["ELEMENTARY", "SEC1_2", "SEC3", "SEC4_5", "CEGEP", "UNI"].map((grade) => {
                    const onlineRate = studyHallPayScales.find((p) => p.gradeLevel === grade && p.mode === "ONLINE")
                    const inPersonRate = studyHallPayScales.find((p) => p.gradeLevel === grade && p.mode === "IN_PERSON")
                    return (
                      <div key={grade} className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 text-center">
                        <p className="text-xs text-zinc-500 mb-2 font-medium">{grade.replace(/_/g, " ")}</p>
                        <div className="space-y-1">
                          <p className="text-xs text-purple-600 dark:text-purple-400">Online ${onlineRate?.rate?.toFixed(0) || "-"}</p>
                          <p className="text-xs text-cyan-600 dark:text-cyan-400">In-person ${inPersonRate?.rate?.toFixed(0) || "-"}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
