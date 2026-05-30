"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

const IMPORT_TYPES = [
  { value: "team", label: "Team Members" },
  { value: "clients", label: "Clients" },
  { value: "projects", label: "Projects" },
  { value: "expenses", label: "Expenses" },
  { value: "invoices", label: "Invoices" },
]

interface PreviewRow {
  row: number
  issues: string[]
  resolved: Record<string, string>
  canImport: boolean
}

function ImportContent() {
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab") || "team"
  const created = searchParams.get("created")
  const skipped = searchParams.get("skipped")
  const err = searchParams.getAll("err")

  const [file, setFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState("")
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [importing, setImporting] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    setFile(f)
    setPreview(null)
    setError("")
    if (f) {
      const reader = new FileReader()
      reader.onload = () => setFileContent(reader.result as string)
      reader.readAsText(f)
    }
  }

  async function handlePreview() {
    if (!file) return
    setLoading(true)
    setError("")
    setPreview(null)

    const fd = new FormData()
    fd.append("file", file)
    fd.append("type", tab)
    fd.append("_action", "preview")

    try {
      const res = await fetch("/api/import", { method: "POST", body: fd })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setPreview(data.preview)
      const importable = new Set<number>()
      data.preview.forEach((r: PreviewRow) => { if (r.canImport) importable.add(r.row - 1) })
      setSelected(importable)
    } catch {
      setError("Failed to preview file")
    } finally {
      setLoading(false)
    }
  }

  function toggleRow(idx: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function toggleAll() {
    if (!preview) return
    const allImportable = preview.filter(r => r.canImport).map(r => r.row - 1)
    if (allImportable.every(i => selected.has(i))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allImportable))
    }
  }

  const hasResult = created || skipped
  const errors = err || []

  return (
    <div>
      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 shadow-xl text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Importing...</p>
            <p className="text-sm text-zinc-500 mt-1">Please don&apos;t close this page</p>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Import Data</h2>

      {hasResult && (
        <div className={`mb-6 rounded-xl border p-4 ${errors.length > 0 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700" : "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"}`}>
          <p className="text-sm font-medium">
            <span className="text-green-800 dark:text-green-300">Created: {created || 0}</span>
            <span className="text-zinc-500 mx-2">&middot;</span>
            <span className="text-amber-700 dark:text-amber-400">Skipped: {skipped || 0}</span>
          </p>
          {errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {errors.map((e, i) => <li key={i} className="text-xs text-red-600 dark:text-red-400">{e}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {IMPORT_TYPES.map((t) => (
          <Link key={t.value} href={`/dashboard/import?tab=${t.value}`}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${tab === t.value ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}>
            {t.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Upload CSV</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">CSV File</label>
              <input type="file" accept=".csv" required
                onChange={handleFileChange}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 dark:file:bg-zinc-700 file:px-3 file:py-1 file:text-xs" />
            </div>
            <button type="button" onClick={handlePreview} disabled={!file || loading}
              className="rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? "Analyzing..." : "Preview"}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Format</h3>
          {tab === "team" && <FormatHelp type="team" />}
          {tab === "clients" && <FormatHelp type="clients" />}
          {tab === "projects" && <FormatHelp type="projects" />}
          {tab === "expenses" && <FormatHelp type="expenses" />}
          {tab === "invoices" && <FormatHelp type="invoices" />}
        </div>
      </div>

      {preview && preview.length > 0 && (
        <div className="mt-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Preview ({preview.length} rows)
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {preview.filter(r => r.canImport).length} valid &middot;
                {selected.size} selected &middot;
                {preview.filter(r => r.issues.length > 0).length} with issues
              </p>
            </div>
            <form action="/api/import" method="POST" encType="multipart/form-data" onSubmit={() => setImporting(true)}>
              <input type="hidden" name="type" value={tab} />
              <input type="hidden" name="fileContent" value={fileContent} />
              <input type="hidden" name="rows" value={JSON.stringify([...selected])} />
              <button type="submit" disabled={selected.size === 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
                Import {selected.size} Rows
              </button>
            </form>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                  <th className="px-3 py-2 text-left">
                    <input type="checkbox" className="rounded"
                      checked={preview.filter(r => r.canImport).every(r => selected.has(r.row - 1))}
                      onChange={toggleAll} />
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase">Row</th>
                  {Object.keys(preview[0].resolved).map(k => (
                    <th key={k} className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase">{k}</th>
                  ))}
                  <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                {preview.map((r) => {
                  const idx = r.row - 1
                  return (
                    <tr key={r.row} className={`text-sm ${!r.canImport ? "bg-red-50 dark:bg-red-900/10" : ""}`}>
                      <td className="px-3 py-2">
                        <input type="checkbox" className="rounded"
                          checked={selected.has(idx)}
                          disabled={!r.canImport}
                          onChange={() => toggleRow(idx)} />
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-500">{r.row}</td>
                      {Object.entries(r.resolved).map(([k, v]) => (
                        <td key={k} className="px-3 py-2 text-zinc-900 dark:text-zinc-100 whitespace-nowrap text-xs">
                          {v || "-"}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-xs text-red-600 dark:text-red-400">
                        {r.issues.length > 0 ? r.issues.join(", ") : <span className="text-green-600 dark:text-green-400">OK</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function FormatHelp({ type }: { type: string }) {
  if (type === "team") return (
    <div className="space-y-2 text-sm">
      <p className="text-zinc-500">CSV columns (header row required):</p>
      <code className="block bg-zinc-50 dark:bg-zinc-900 rounded p-3 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{"first_name, last_name, email, tenure, role, subjects, grade_levels, phone, city, created_at\nSarah, Chen, sarah@email.com, 1ST_YEAR, TUTOR, \"Math, Physics\", \"ELEMENTARY, SEC3\", 514-555-0101, Montreal, 2024-09-01"}</code>
      <div className="text-xs text-zinc-400 space-y-1 mt-2">
        <p><strong>first_name, last_name</strong> — required (or use single &ldquo;name&rdquo; column)</p>
        <p><strong>email</strong> — required, unique</p>
        <p><strong>tenure</strong> — 1ST_YEAR, 2ND_YEAR, 3RD_YEAR</p>
        <p><strong>role</strong> — TUTOR or CITY_ADMIN (default: TUTOR)</p>
        <p><strong>grade_levels</strong> — ELEMENTARY, SEC1_2, SEC3, SEC4_5, CEGEP, UNI</p>
        <p><strong>phone</strong> — optional</p>
        <p><strong>city</strong> — city name to assign</p>
        <p><strong>created_at</strong> — optional date (YYYY-MM-DD), defaults to today</p>
        <p className="text-amber-600 dark:text-amber-400 mt-2">All imported tutors start at onboarding step 0 (go through full onboarding).</p>
      </div>
    </div>
  )
  if (type === "clients") return (
    <div className="space-y-2 text-sm">
      <p className="text-zinc-500">CSV columns:</p>
      <code className="block bg-zinc-50 dark:bg-zinc-900 rounded p-3 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">first_name, last_name, email, type, company, phone, address, city, province, country, postal_code, notes, created_at
John, Smith, john@email.com, PARENT,, 514-555-0100, 123 Main St, Montreal, QC, CA, H3A 1A1, &ldquo;Referred by Sarah&rdquo;, 2025-01-15</code>
      <div className="text-xs text-zinc-400 space-y-1 mt-2">
        <p><strong>first_name, last_name</strong> — required (or use single &ldquo;name&rdquo; column)</p>
        <p><strong>type</strong> — PARENT or SCHOOL</p>
        <p><strong>company, phone, address, city</strong> — optional</p>
        <p><strong>province, country, postal_code</strong> — optional</p>
        <p><strong>notes</strong> — optional, free text</p>
        <p><strong>created_at</strong> — optional date (YYYY-MM-DD), defaults to today</p>
      </div>
    </div>
  )
  if (type === "projects") return (
    <div className="space-y-2 text-sm">
      <p className="text-zinc-500">CSV columns:</p>
      <code className="block bg-zinc-50 dark:bg-zinc-900 rounded p-3 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">student_name, client_email, grade_level, subjects, description, project_type, school, status, city, created_at
Sarah, john@email.com, SEC3, Math,, STUDENT,, ON_HOLD, Montreal, 2024-09-01
Study Hall Q1, admin@wsh.qc.ca, ELEMENTARY,, After-school tutoring program, STUDY_HALL, Westmount High, ON_HOLD,,</code>
      <div className="text-xs text-zinc-400 space-y-1 mt-2">
        <p><strong>student_name</strong> — required</p>
        <p><strong>client_email</strong> — required, must match existing client</p>
        <p><strong>grade_level</strong> — ELEMENTARY, SEC1_2, SEC3, SEC4_5, CEGEP, UNI</p>
        <p><strong>description</strong> — optional, saved as project notes</p>
        <p><strong>project_type</strong> — STUDENT or STUDY_HALL (default: STUDENT)</p>
        <p><strong>school, status, city</strong> — optional</p>
        <p><strong>created_at</strong> — optional date (YYYY-MM-DD)</p>
        <p className="text-amber-600 dark:text-amber-400 mt-2">Name is auto-generated from student_name + grade + parent. Default status is ON_HOLD.<br />Projects are imported without tutor assignments.</p>
      </div>
    </div>
  )
  if (type === "expenses") return (
    <div className="space-y-2 text-sm">
      <p className="text-zinc-500">CSV columns:</p>
      <code className="block bg-zinc-50 dark:bg-zinc-900 rounded p-3 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">description, amount, category, date, city
Office supplies, 45.99, SUPPLIES, 2026-05-15, Montreal</code>
    </div>
  )
  if (type === "invoices") return (
    <div className="space-y-2 text-sm">
      <p className="text-zinc-500">CSV columns:</p>
      <code className="block bg-zinc-50 dark:bg-zinc-900 rounded p-3 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">client_email, description, hours, rate, amount, status, due_date
john@email.com, Tutoring May 2026, 4, 45, 180, SENT, 2026-06-15</code>
      <div className="text-xs text-zinc-400 space-y-1 mt-2">
        <p><strong>client_email</strong> — must match existing client</p>
      </div>
    </div>
  )
  return null
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Loading...</div>}>
      <ImportContent />
    </Suspense>
  )
}
