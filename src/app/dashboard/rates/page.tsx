import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { GRADE_LABELS, TENURE_LABELS } from "@/lib/constants"
import { redirect } from "next/navigation"
import Link from "next/link"
import { EditableRate } from "@/components/editable-rate"

export default async function RatesPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const { tab } = await props.searchParams
  const activeTab = tab || "cities"

  const cities = activeTab === "cities" ? await prisma.city.findMany({ orderBy: { name: "asc" } }) : []
  const billingRates = activeTab === "billing" ? await prisma.billingRate.findMany({ orderBy: [{ gradeLevel: "asc" }, { mode: "asc" }] }) : []
  const payScales = activeTab === "payscales" ? await prisma.payScale.findMany({ orderBy: [{ tenure: "asc" }, { gradeLevel: "asc" }, { mode: "asc" }] }) : []

  const GRADES = Object.keys(GRADE_LABELS)
  const TENURES = Object.keys(TENURE_LABELS)

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Rates & Cities</h2>

      <div className="flex gap-2 mb-6">
        {[
          { value: "cities", label: "Cities" },
          { value: "billing", label: "Billing Rates" },
          { value: "payscales", label: "Pay Scales" },
        ].map((t) => (
          <Link key={t.value} href={`/dashboard/rates?tab=${t.value}`}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${activeTab === t.value ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === "cities" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Add City</h3>
            <form action="/api/rates" method="POST" className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <input type="hidden" name="type" value="city" />
              <div>
                <label className="block text-xs text-zinc-500 mb-1">City Name</label>
                <input type="text" name="name" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Slug</label>
                <input type="text" name="slug" required placeholder="montreal"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Profit %</label>
                <input type="number" name="profitPct" defaultValue={30} min={0} max={100}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                Add City
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Slug</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Profit %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                {cities.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{c.slug}</td>
                    <td className="px-4 py-3 text-sm text-right text-zinc-600 dark:text-zinc-400">{c.profitPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "billing" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Add Billing Rate</h3>
            <form action="/api/rates" method="POST" className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <input type="hidden" name="type" value="billing" />
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Grade Level</label>
                <select name="gradeLevel" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {GRADES.map(g => (<option key={g} value={g}>{GRADE_LABELS[g]}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Mode</label>
                <select name="mode" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="ONLINE">Online</option>
                  <option value="IN_PERSON">In Person</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Project Type</label>
                <select name="projectType" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="STUDENT">Private Tutoring</option>
                  <option value="STUDY_HALL">Study Hall / Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Rate ($/hr)</label>
                <input type="number" name="rate" required min={0} step={0.01}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                Add Billing Rate
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Grade</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Mode</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Rate</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                {billingRates.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">{GRADE_LABELS[r.gradeLevel]}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{r.mode === "ONLINE" ? "Online" : "In Person"}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{r.projectType === "STUDY_HALL" ? "Study Hall" : "Private Tutoring"}</td>
                    <td className="px-4 py-3"><EditableRate id={r.id} rate={r.rate} type="billing" /></td>
                    <td className="px-4 py-3 text-center">
                      <form action="/api/rates" method="POST">
                        <input type="hidden" name="type" value="deleteBilling" />
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="text-xs text-red-600 dark:text-red-400 hover:underline">Del</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "payscales" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Add Pay Scale</h3>
            <form action="/api/rates" method="POST" className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
              <input type="hidden" name="type" value="payscale" />
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Tenure</label>
                <select name="tenure" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TENURES.map(t => (<option key={t} value={t}>{TENURE_LABELS[t]}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Grade Level</label>
                <select name="gradeLevel" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {GRADES.map(g => (<option key={g} value={g}>{GRADE_LABELS[g]}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Mode</label>
                <select name="mode" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="ONLINE">Online</option>
                  <option value="IN_PERSON">In Person</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Project Type</label>
                <select name="projectType" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="STUDENT">Private Tutoring</option>
                  <option value="STUDY_HALL">Study Hall / Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Rate ($/hr)</label>
                <input type="number" name="rate" required min={0} step={0.01}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                Add Pay Scale
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Tenure</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Grade</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Mode</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500">Rate</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                {payScales.map((ps) => (
                  <tr key={ps.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">{TENURE_LABELS[ps.tenure]}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{GRADE_LABELS[ps.gradeLevel]}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{ps.mode === "ONLINE" ? "Online" : "In Person"}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{ps.projectType === "STUDY_HALL" ? "Study Hall" : "Private Tutoring"}</td>
                    <td className="px-4 py-3"><EditableRate id={ps.id} rate={ps.rate} type="payscale" /></td>
                    <td className="px-4 py-3 text-center">
                      <form action="/api/rates" method="POST">
                        <input type="hidden" name="type" value="deletePayScale" />
                        <input type="hidden" name="id" value={ps.id} />
                        <button type="submit" className="text-xs text-red-600 dark:text-red-400 hover:underline">Del</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
