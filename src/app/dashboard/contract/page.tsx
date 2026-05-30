import { prisma } from "@/lib/db"
import { requireAuth, isTutor, getTutorId, isClient, getClientId } from "@/lib/auth-helpers"
import { CONTRACT_TYPE_LABELS, TENURE_LABELS, GRADE_LABELS, STUDENT_GRADES, TUTOR_STUDY_HALL_GRADES, SUPERVISOR_GRADES } from "@/lib/constants"
import { redirect } from "next/navigation"

const TOS_TEXT = `J.A.S.S. Tutoring Services — Terms of Service

1. SERVICES
J.A.S.S. Tutoring ("J.A.S.S.", "we", "us") provides tutoring matching services connecting students with qualified tutors.

2. PAYMENT
Clients agree to pay for tutoring sessions at the rates established in their invoice. Payment is due within 30 days of invoice date unless otherwise specified.

3. CANCELLATION
Sessions cancelled with less than 24 hours notice may be subject to a cancellation fee at the discretion of the tutor.

4. LIABILITY
J.A.S.S. acts as a matching service. While we vet all tutors, we are not liable for disputes between clients and tutors. Any concerns should be reported immediately.

5. PRIVACY
Client information is kept confidential and used solely for the purpose of providing tutoring services.

6. AGREEMENT
By accepting these terms, you agree to the conditions outlined above. These terms may be updated periodically.`


export default async function ContractPage(props: { searchParams: Promise<{ filter?: string }> }) {
  const session = await requireAuth()
  const isTutorRole = isTutor(session.user.role)
  const isClientRole = isClient(session.user.role)
  if (!isTutorRole && !isClientRole) redirect("/dashboard")

  const { filter: filterParam } = await props.searchParams
  const activeFilter = filterParam || "pending"

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

  const allContracts = await prisma.contract.findMany({
    where: { tutorId },
    orderBy: { createdAt: "desc" },
    include: { tutor: { select: { tenure: true } } },
  })

  const pending = allContracts.filter(c => !c.signed && c.status !== "EXPIRED")
  const active = allContracts.filter(c => c.signed && c.status === "ACTIVE")
  const expired = allContracts.filter(c => c.status === "EXPIRED" || (!c.signed && c.status === "EXPIRED"))

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">My Contract</h2>

      {allContracts.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
          <p className="text-zinc-500 dark:text-zinc-400 mb-2">No contracts found.</p>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">Contact your admin to set up a contract.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filter toggles */}
          <div className="flex gap-2">
            {[
              { value: "pending", label: "Pending", count: pending.length, color: "text-amber-600 dark:text-amber-400" },
              { value: "active", label: "Active", count: active.length, color: "text-green-600 dark:text-green-400" },
              { value: "expired", label: "Expired", count: expired.length, color: "text-zinc-400" },
            ].map(tab => (
              <a
                key={tab.value}
                href={`/dashboard/contract?filter=${tab.value}`}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  activeFilter === tab.value
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : `text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 ${tab.color}`
                }`}
              >
                {tab.label} ({tab.count})
              </a>
            ))}
          </div>

          {/* Pending (unsigned) */}
          {(activeFilter === "pending" || !activeFilter) && pending.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-amber-600 dark:text-amber-400">Pending ({pending.length})</h3>
              {pending.map(c => (
                <ContractCard key={c.id} contract={c} showSign />
              ))}
            </div>
          )}

          {/* Active */}
          {(activeFilter === "active" || !activeFilter) && active.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Active ({active.length})</h3>
              {active.map(c => (
                <ContractCard key={c.id} contract={c} />
              ))}
            </div>
          )}

          {/* Expired */}
          {(activeFilter === "expired" || !activeFilter) && expired.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-zinc-400">Expired ({expired.length})</h3>
              {expired.map(c => (
                <ContractCard key={c.id} contract={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ContractCard({ contract, showSign }: {
  contract: { id: string; type: string; yearLevel: string; startDate: Date; endDate: Date; signed: boolean; signedAt: Date | null; status: string; terms: string; rates: string }
  showSign?: boolean
}) {
  const ratesMap: Record<string, number> = (() => { try { return JSON.parse(contract.rates) } catch { return {} } })()
  const grades = contract.type === "PROGRAM_SUPERVISOR"
    ? [...STUDENT_GRADES, ...SUPERVISOR_GRADES]
    : [...STUDENT_GRADES, ...TUTOR_STUDY_HALL_GRADES]

  return (
    <details className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 group">
      <summary className="p-6 cursor-pointer list-none flex items-center justify-between">
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm flex-1">
          <div>
            <dt className="text-xs text-zinc-500">Type</dt>
            <dd className="text-zinc-900 dark:text-zinc-100 font-medium">{CONTRACT_TYPE_LABELS[contract.type] || contract.type}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Year Level</dt>
            <dd className="text-zinc-900 dark:text-zinc-100 font-medium">{TENURE_LABELS[contract.yearLevel] || contract.yearLevel}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Start Date</dt>
            <dd className="text-zinc-600 dark:text-zinc-400">{new Date(contract.startDate).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">End Date</dt>
            <dd className="text-zinc-600 dark:text-zinc-400">{new Date(contract.endDate).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">Status</dt>
            <dd>
              <span className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${
                contract.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : contract.status === "EXPIRED" ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              }`}>{contract.status}</span>
              {contract.signed && (
                <span className="ml-2 inline-flex text-xs font-medium rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  Signed {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString() : ""}
                </span>
              )}
            </dd>
          </div>
        </dl>
        <span className="text-xs text-zinc-400 ml-2 group-open:hidden">Details</span>
        <span className="text-xs text-zinc-400 ml-2 hidden group-open:inline">Close</span>
      </summary>
      <div className="px-6 pb-6 border-t border-zinc-100 dark:border-zinc-700/50 pt-4 space-y-4">
        {contract.terms && (
          <div>
            <p className="text-xs text-zinc-500 mb-1">Terms</p>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{contract.terms}</p>
          </div>
        )}
        {!contract.terms && <p className="text-sm text-zinc-400">No terms specified.</p>}

        {grades.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 mb-2">{contract.type === "PROGRAM_SUPERVISOR" ? "Supervisor Rates" : "Rates"}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {grades.map((grade) => {
                const rate = ratesMap[grade]
                return (
                  <div key={grade} className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-zinc-500 mb-1">{GRADE_LABELS[grade] || grade}</p>
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">${rate !== undefined ? rate.toFixed(0) : "—"}/hr</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {showSign && !contract.signed && (
          <form action="/api/contracts/sign" method="POST">
            <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors">Sign Contract</button>
          </form>
        )}
      </div>
    </details>
  )
}
