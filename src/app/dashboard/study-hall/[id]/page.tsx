import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, getCityAccessScope, assertInScope } from "@/lib/auth-helpers"
import { notFound, redirect } from "next/navigation"
import { STUDY_HALL_BILLING_MODEL_LABELS, STUDY_HALL_CYCLE_STATUS_LABELS, STUDY_HALL_CYCLE_STATUS_COLORS, REGISTRATION_STATUS_LABELS, REGISTRATION_STATUS_COLORS } from "@/lib/constants"
import { StudyHallCycleEditor } from "@/components/study-hall-cycle-editor"
import { CopyButton } from "@/components/copy-button"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function StudyHallCycleDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") redirect("/dashboard/study-hall")

  const { id } = await props.params

  const cycle = await prisma.studyHallCycle.findUnique({
    where: { id },
    include: {
      schoolClient: { include: { user: { select: { name: true, email: true } } } },
      city: { select: { name: true } },
      project: { select: { id: true, name: true } },
      registrations: {
        include: { client: { include: { user: { select: { name: true } } } }, invoice: { select: { id: true, number: true, status: true } } },
        orderBy: { createdAt: "desc" },
      },
      discountCodes: { select: { id: true, code: true, description: true, discountPct: true, discountAmt: true, isActive: true, validFrom: true, validUntil: true } },
    },
  })

  if (!cycle) notFound()

  const scopeError = assertInScope(cycle.cityId, scope)
  if (scopeError) redirect("/dashboard/study-hall")

  const pendingCount = cycle.registrations.filter(r => r.status === "PENDING").length
  const confirmedCount = cycle.registrations.filter(r => r.status === "CONFIRMED").length
  const paidCount = cycle.registrations.filter(r => r.status === "PAID").length
  const totalRevenue = cycle.registrations.filter(r => r.status === "PAID").reduce((s, r) => s + r.totalAmount, 0)

  let dayOptions: Array<{ id: string; label: string; sessionsCount: number; price: number }> = []
  let formConfig: Record<string, boolean> = {}
  try { dayOptions = JSON.parse(cycle.dayOptions) } catch { /* default */ }
  try { formConfig = JSON.parse(cycle.formConfig) } catch { /* default */ }

  const publicUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/study-hall/${cycle.slug}`

  return (
    <div>
      <PageBreadcrumb items={[{ label: "Study Hall", href: "/dashboard/study-hall" }, { label: cycle.name }]} />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">{cycle.name}</h2>
          <p className="text-sm text-zinc-500">
            {cycle.schoolClient?.user.name || "No school"} · {STUDY_HALL_BILLING_MODEL_LABELS[cycle.billingModel as keyof typeof STUDY_HALL_BILLING_MODEL_LABELS]}
            {cycle.city?.name && ` · ${cycle.city.name}`}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {new Date(cycle.startDate).toLocaleDateString()} — {new Date(cycle.endDate).toLocaleDateString()}
          </p>
        </div>
        <span className={`text-xs font-medium rounded-full px-3 py-1 ${STUDY_HALL_CYCLE_STATUS_COLORS[cycle.status] || ""}`}>
          {STUDY_HALL_CYCLE_STATUS_LABELS[cycle.status as keyof typeof STUDY_HALL_CYCLE_STATUS_LABELS] || cycle.status}
        </span>
      </div>

      {cycle.status !== "CLOSED" && (
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase mb-0.5">Public Registration Link</p>
            <p className="text-sm text-blue-600 dark:text-blue-400">{publicUrl}</p>
          </div>
          <CopyButton text={publicUrl} />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Pending</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Confirmed</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{confirmedCount}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Paid</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{paidCount}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <p className="text-xs text-zinc-500 uppercase">Revenue</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">${totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      {cycle.status === "DRAFT" && (
        <form action={`/api/study-hall/cycles/${cycle.id}`} method="POST" className="mb-6">
          <input type="hidden" name="_action" value="open" />
          <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors">
            Open Registration
          </button>
        </form>
      )}

      {cycle.status === "OPEN" && (
        <form action={`/api/study-hall/cycles/${cycle.id}`} method="POST" className="mb-6">
          <input type="hidden" name="_action" value="close" />
          <button type="submit" className="rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors">
            Close Registration
          </button>
        </form>
      )}

      <details className="mb-6">
        <summary className="cursor-pointer text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mb-3">Edit Cycle Configuration</summary>
        <StudyHallCycleEditor
          cycle={cycle}
          dayOptions={dayOptions}
          formConfig={formConfig}
        />
      </details>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Registrations ({cycle.registrations.length})</h3>
          {cycle.billingModel === "LUMP_SUM" && (
            <form action={`/api/study-hall/cycles/${cycle.id}`} method="POST">
              <input type="hidden" name="_action" value="lump-sum-invoice" />
              <button type="submit" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                Create Lump-Sum Invoice
              </button>
            </form>
          )}
        </div>

        {cycle.billingModel === "LUMP_SUM_ROSTER" && (
          <details className="mb-4">
            <summary className="cursor-pointer text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mb-2">+ Add student to roster</summary>
            <form action={`/api/study-hall/cycles/${cycle.id}/registrations`} method="POST" className="mt-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input type="hidden" name="_action" value="manual-add" />
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Student name *</label>
                <input type="text" name="studentName" required className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Grade</label>
                <input type="text" name="grade" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Parent name</label>
                <input type="text" name="parentName" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Parent email</label>
                <input type="email" name="parentEmail" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Parent phone</label>
                <input type="tel" name="parentPhone" className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100" />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors">Add to Roster</button>
              </div>
            </form>
          </details>
        )}

        {cycle.registrations.length === 0 ? (
          <p className="text-sm text-zinc-500">No registrations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Parent</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Days</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cycle.registrations.map((reg) => {
                  let days: string[] = []
                  try { days = JSON.parse(reg.daySelections) } catch { /* */ }
                  return (
                    <tr key={reg.id} className="text-sm border-b border-zinc-100 dark:border-zinc-700/50">
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                        {reg.studentName}
                        {reg.grade && <span className="text-xs text-zinc-400 ml-1">({reg.grade})</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {reg.parentName}<br />
                        <span className="text-xs">{reg.parentEmail}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">
                        {days.join(", ") || "-"}
                        <span className="text-zinc-400 ml-1">({reg.sessionsCount} sess.)</span>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-100">
                        ${reg.totalAmount.toFixed(2)}
                        {(reg.discountAmount > 0 || reg.preregDiscount > 0) && (
                          <span className="text-xs text-red-500 ml-1">
                            -${(reg.discountAmount + reg.preregDiscount).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${REGISTRATION_STATUS_COLORS[reg.status] || ""}`}>
                          {REGISTRATION_STATUS_LABELS[reg.status as keyof typeof REGISTRATION_STATUS_LABELS] || reg.status}
                        </span>
                        {reg.invoice && (
                          <Link href={`/dashboard/invoices/${reg.invoice.id}`} className="text-xs text-blue-500 ml-1 hover:underline">
                            {reg.invoice.number}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {reg.status === "PENDING" && (
                          <form action={`/api/study-hall/registrations/${reg.id}`} method="POST" className="inline">
                            <input type="hidden" name="_action" value="confirm" />
                            <button type="submit" className="text-xs text-green-600 dark:text-green-400 hover:underline mr-2">Confirm</button>
                          </form>
                        )}
                        {(reg.status === "PENDING" || reg.status === "CONFIRMED") && (
                          <form action={`/api/study-hall/registrations/${reg.id}`} method="POST" className="inline">
                            <input type="hidden" name="_action" value="cancel" />
                            <button type="submit" className="text-xs text-red-600 dark:text-red-400 hover:underline">Cancel</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {cycle.discountCodes.length > 0 && (
        <div className="mt-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Discount Codes for this Cycle</h3>
          <div className="space-y-2">
            {cycle.discountCodes.map(dc => (
              <div key={dc.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{dc.code}</span>
                  <span className="text-zinc-500 ml-2">{dc.description}</span>
                </div>
                <div className="text-xs text-zinc-500">
                  {dc.discountPct > 0 ? `${dc.discountPct}% off` : dc.discountAmt > 0 ? `$${dc.discountAmt.toFixed(2)} off` : ""}
                  {dc.validUntil && ` · until ${new Date(dc.validUntil).toLocaleDateString()}`}
                  {!dc.isActive && " · INACTIVE"}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-400 mt-3">
            <Link href="/dashboard/discounts" className="text-blue-500 hover:underline">Manage discount codes →</Link>
          </p>
        </div>
      )}
    </div>
  )
}
