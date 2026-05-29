import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"

const IMPORT_TYPES = [
  { value: "team", label: "Team Members" },
  { value: "clients", label: "Clients" },
  { value: "expenses", label: "Expenses" },
  { value: "invoices", label: "Invoices" },
]

export default async function ImportPage(props: { searchParams: Promise<{ tab?: string; created?: string; skipped?: string; err?: string | string[] }> }) {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const { tab, created, skipped, err } = await props.searchParams
  const activeTab = tab || "team"
  const hasResult = created || skipped
  const errors = err ? (Array.isArray(err) ? err : [err]) : []

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Import Data</h2>

      {hasResult && (
        <div className={`mb-6 rounded-xl border p-4 ${errors.length > 0 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700" : "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"}`}>
          <p className="text-sm font-medium text-green-800 dark:text-green-300">Created: {created || 0} &middot; Skipped: {skipped || 0}</p>
          {errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {errors.map((e, i) => <li key={i} className="text-xs text-red-600 dark:text-red-400">{e}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {IMPORT_TYPES.map((t) => {
          const params = new URLSearchParams()
          params.set("tab", t.value)
          return (
            <Link key={t.value} href={`/dashboard/import?${params.toString()}`}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${activeTab === t.value ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}>
              {t.label}
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Upload CSV</h3>
          <form action="/api/import" method="POST" encType="multipart/form-data" className="space-y-4">
            <input type="hidden" name="type" value={activeTab} />
            <div>
              <label className="block text-xs text-zinc-500 mb-1">CSV File</label>
              <input type="file" name="file" accept=".csv" required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 dark:file:bg-zinc-700 file:px-3 file:py-1 file:text-xs" />
            </div>
            <button type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              Import {IMPORT_TYPES.find(t => t.value === activeTab)?.label || ""}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Format</h3>
          {activeTab === "team" && (
            <div className="space-y-2 text-sm">
              <p className="text-zinc-500">CSV columns (header row required):</p>
              <code className="block bg-zinc-50 dark:bg-zinc-900 rounded p-3 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">name, email, tenure, subjects, grade_levels, city, onboarded
Sarah Chen, sarah@email.com, 1ST_YEAR, "Math, Physics", "ELEMENTARY, SEC3", Montreal, true
David Nguyen, david@email.com, 2ND_YEAR, "English, French", "SEC1_2, SEC4_5", Montreal, false</code>
              <div className="text-xs text-zinc-400 space-y-1 mt-2">
                <p><strong>name</strong> — required</p>
                <p><strong>email</strong> — required, unique</p>
                <p><strong>tenure</strong> — 1ST_YEAR, 2ND_YEAR, or 3RD_YEAR (default: 1ST_YEAR)</p>
                <p><strong>subjects</strong> — comma-separated (default: empty)</p>
                <p><strong>grade_levels</strong> — comma-separated grade codes (default: empty)</p>
                <p><strong>city</strong> — city name to assign (default: none)</p>
                <p><strong>onboarded</strong> — true/false, if false goes to waitlist (default: false)</p>
              </div>
            </div>
          )}
          {activeTab === "clients" && (
            <div className="space-y-2 text-sm">
              <p className="text-zinc-500">CSV columns (header row required):</p>
              <code className="block bg-zinc-50 dark:bg-zinc-900 rounded p-3 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">name, email, type, company, phone, address, city
John Smith, john@email.com, PARENT, , 514-555-0100, 123 Main St, Montreal
Westmount High, admin@wsh.qc.ca, SCHOOL, Westmount High, 514-555-0200, 456 Elm Ave, Montreal</code>
              <div className="text-xs text-zinc-400 space-y-1 mt-2">
                <p><strong>name</strong> — required</p>
                <p><strong>email</strong> — required, unique</p>
                <p><strong>type</strong> — PARENT or SCHOOL</p>
                <p><strong>company</strong> — optional</p>
                <p><strong>phone</strong> — optional</p>
                <p><strong>address</strong> — optional</p>
                <p><strong>city</strong> — city name (default: none)</p>
              </div>
            </div>
          )}
          {activeTab === "expenses" && (
            <div className="space-y-2 text-sm">
              <p className="text-zinc-500">CSV columns (header row required):</p>
              <code className="block bg-zinc-50 dark:bg-zinc-900 rounded p-3 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">description, amount, category, date, city
Office supplies, 45.99, SUPPLIES, 2026-05-15, Montreal
Software subscription, 99.00, SOFTWARE, 2026-05-01, Montreal</code>
            </div>
          )}
          {activeTab === "invoices" && (
            <div className="space-y-2 text-sm">
              <p className="text-zinc-500">CSV columns (header row required):</p>
              <code className="block bg-zinc-50 dark:bg-zinc-900 rounded p-3 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">client_email, description, hours, rate, amount, status, due_date
john@email.com, Tutoring May 2026, 4, 45.00, 180.00, SENT, 2026-06-15
sarah@email.com, Tutoring May 2026, 2, 40.00, 80.00, DRAFT, 2026-06-15</code>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
