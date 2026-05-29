import { prisma } from "@/lib/db"
import { requireAuth, isTutor, getTutorId } from "@/lib/auth-helpers"
import { CONTRACT_TYPE_LABELS, TENURE_LABELS } from "@/lib/constants"
import { redirect } from "next/navigation"

export default async function ContractPage() {
  const session = await requireAuth()
  if (!isTutor(session.user.role)) redirect("/dashboard")

  const tutorId = await getTutorId(session.user.id, session.user.email)
  if (!tutorId) redirect("/dashboard")

  const contract = await prisma.contract.findFirst({
    where: { tutorId, status: "ACTIVE" },
    include: { tutor: { select: { tenure: true } } },
  })

  const payScales = contract
    ? await prisma.payScale.findMany({
        where: { tenure: contract.yearLevel },
        orderBy: [{ gradeLevel: "asc" }, { mode: "asc" }],
      })
    : []

  const billingRates = await prisma.billingRate.findMany({
    orderBy: [{ gradeLevel: "asc" }, { mode: "asc" }],
  })

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">My Contract</h2>

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
                <dd className="text-zinc-900 dark:text-zinc-100 font-medium">
                  {CONTRACT_TYPE_LABELS[contract.type] || contract.type}
                </dd>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-700/50">
                <dt className="text-zinc-500">Year Level</dt>
                <dd className="text-zinc-900 dark:text-zinc-100 font-medium">
                  {TENURE_LABELS[contract.yearLevel] || contract.yearLevel}
                </dd>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-700/50">
                <dt className="text-zinc-500">Start Date</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">
                  {new Date(contract.startDate).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-700/50">
                <dt className="text-zinc-500">End Date</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">
                  {new Date(contract.endDate).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-700/50">
                <dt className="text-zinc-500">Status</dt>
                <dd>
                  <span className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${
                    contract.status === "ACTIVE"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {contract.status}
                  </span>
                  {contract.signed && (
                    <span className="ml-2 inline-flex text-xs font-medium rounded-full px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      Signed {contract.signedAt ? new Date(contract.signedAt).toLocaleDateString() : ""}
                    </span>
                  )}
                </dd>
              </div>
            </dl>

            {!contract.signed && (
              <form action="/api/contracts/sign" method="POST" className="mt-6">
                <button type="submit"
                  className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors">
                  Sign Contract
                </button>
              </form>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Terms</h3>
            {contract.terms ? (
              <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {contract.terms}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No terms specified.</p>
            )}
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Your Pay Rates ({TENURE_LABELS[contract.yearLevel]})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {["ELEMENTARY", "SEC1_2", "SEC3", "SEC4_5", "CEGEP", "UNI"].map((grade) => {
                const onlineRate = payScales.find((p) => p.gradeLevel === grade && p.mode === "ONLINE")
                const inPersonRate = payScales.find((p) => p.gradeLevel === grade && p.mode === "IN_PERSON")
                return (
                  <div key={grade} className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 text-center">
                    <p className="text-xs text-zinc-500 mb-2 font-medium">{grade.replace("_", " ")}</p>
                    <div className="space-y-1">
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        Online ${onlineRate?.rate?.toFixed(0) || "-"}
                      </p>
                      <p className="text-xs text-cyan-600 dark:text-cyan-400">
                        In-person ${inPersonRate?.rate?.toFixed(0) || "-"}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
