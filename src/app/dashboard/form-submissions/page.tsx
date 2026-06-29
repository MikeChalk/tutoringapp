import { prisma } from "@/lib/db"
import { requireAdmin } from "@/lib/auth-helpers"
import Link from "next/link"
import { FORM_TYPES, FORM_TYPE_LABELS, type FormType } from "@/lib/constants"

type Tone = "pending" | "progress" | "done"
type MigratedTo = { label: string; href?: string; tone: Tone } | null
type Row = {
  id: string
  formType: FormType
  createdAt: Date
  name: string
  email: string
  subject: string
  city?: string
  status: string
  migratedTo: MigratedTo
}

const FORM_TABS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "REQUEST_TUTOR", label: FORM_TYPE_LABELS.REQUEST_TUTOR },
  { value: "CAREERS", label: FORM_TYPE_LABELS.CAREERS },
]

const FORM_BADGE_COLORS: Record<FormType, string> = {
  REQUEST_TUTOR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CAREERS: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
}

const TONE_COLORS: Record<Tone, string> = {
  pending: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400",
  progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
}

function buildHref(form: string, search: string, from: string, to: string, page: number) {
  const params = new URLSearchParams()
  if (form) params.set("form", form)
  if (search) params.set("search", search)
  if (from) params.set("from", from)
  if (to) params.set("to", to)
  if (page > 1) params.set("page", String(page))
  const qs = params.toString()
  return `/dashboard/form-submissions${qs ? `?${qs}` : ""}`
}

export default async function FormSubmissionsPage(props: {
  searchParams: Promise<{ form?: string; search?: string; from?: string; to?: string; page?: string }>
}) {
  await requireAdmin()

  const { form: formParam, search: searchParam, from: fromDate, to: toDate, page: pageParam } = await props.searchParams
  const selectedForm = formParam && FORM_TYPES.includes(formParam as FormType) ? (formParam as FormType) : ""
  const searchQuery = searchParam || ""
  const page = parseInt(pageParam || "1") || 1
  const pageSize = 50

  const dateRange = (): Record<string, Date> | undefined => {
    const range: Record<string, Date> = {}
    if (fromDate) range.gte = new Date(fromDate)
    if (toDate) range.lte = new Date(toDate + "T23:59:59")
    return (fromDate || toDate) ? range : undefined
  }

  const rows: Row[] = []

  if (!selectedForm || selectedForm === "REQUEST_TUTOR") {
    const where: Record<string, unknown> = {}
    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery } },
        { email: { contains: searchQuery } },
        { subject: { contains: searchQuery } },
        { studentName: { contains: searchQuery } },
      ]
    }
    const dr = dateRange()
    if (dr) where.createdAt = dr

    const requests = await prisma.tutoringRequest.findMany({
      where,
      include: {
        city: { select: { name: true } },
        matchedTutor: { include: { user: { select: { name: true } } } },
        client: { include: { projects: { select: { id: true, name: true }, orderBy: { createdAt: "desc" } } } },
      },
      orderBy: { createdAt: "desc" },
    })

    for (const r of requests) {
      let migratedTo: MigratedTo = { label: "Awaiting match", tone: "pending" }
      if (r.client && r.client.projects.length > 0) {
        const p = r.client.projects[0]
        migratedTo = { label: `Project: ${p.name}`, href: `/dashboard/projects/${p.id}`, tone: "done" }
      } else if (r.status === "ACCEPTED" && r.matchedTutor) {
        migratedTo = { label: `Accepted by ${r.matchedTutor.user.name}`, href: `/dashboard/tutors/${r.matchedTutor.id}`, tone: "done" }
      } else if (r.status === "MATCHED" && r.matchedTutor) {
        migratedTo = { label: `Matched to ${r.matchedTutor.user.name}`, href: `/dashboard/tutors/${r.matchedTutor.id}`, tone: "progress" }
      } else if (r.clientId && r.client) {
        migratedTo = { label: "Client created", href: `/dashboard/clients/${r.client.id}`, tone: "progress" }
      }

      rows.push({
        id: r.id,
        formType: "REQUEST_TUTOR",
        createdAt: r.createdAt,
        name: r.studentName ? `${r.name} (${r.studentName})` : r.name,
        email: r.email,
        subject: r.subject,
        city: r.city?.name,
        status: r.status,
        migratedTo,
      })
    }
  }

  if (!selectedForm || selectedForm === "CAREERS") {
    const userWhere: Record<string, unknown> = { role: "TUTOR" }
    if (searchQuery) {
      userWhere.OR = [
        { name: { contains: searchQuery } },
        { email: { contains: searchQuery } },
      ]
    }
    const dr = dateRange()
    if (dr) userWhere.createdAt = dr

    const tutors = await prisma.tutor.findMany({
      where: { user: userWhere },
      include: {
        user: { select: { name: true, email: true, createdAt: true, city: { select: { name: true } } } },
        projectTutors: { select: { id: true, project: { select: { id: true, name: true } } } },
      },
      orderBy: { user: { createdAt: "desc" } },
    })

    for (const t of tutors) {
      let status = "AWAITING_DOCS"
      if (!t.cvUploaded && !t.transcriptUploaded) status = "AWAITING_DOCS"
      else if (!t.onboarded && t.onboardingStep === 0) status = "WAITLIST"
      else if (!t.onboarded) status = "ONBOARDING"
      else status = "ONBOARDED"

      let migratedTo: MigratedTo = { label: "Awaiting docs", href: "/dashboard/waitlist", tone: "pending" }
      if (t.onboarded && t.projectTutors.length > 0) {
        const pt = t.projectTutors[0]
        migratedTo = { label: `Project: ${pt.project.name}`, href: `/dashboard/projects/${pt.project.id}`, tone: "done" }
      } else if (t.onboarded) {
        migratedTo = { label: "Onboarded", href: `/dashboard/tutors/${t.id}`, tone: "done" }
      } else if (t.onboardingStep > 0) {
        migratedTo = { label: `Onboarding step ${t.onboardingStep}`, href: "/dashboard/onboarding", tone: "progress" }
      } else if (t.cvUploaded || t.transcriptUploaded) {
        migratedTo = { label: "Docs received", href: "/dashboard/waitlist", tone: "progress" }
      }

      rows.push({
        id: t.id,
        formType: "CAREERS",
        createdAt: t.user.createdAt,
        name: t.user.name,
        email: t.user.email,
        subject: t.subjects || t.currentStudies || "—",
        city: t.user.city?.name,
        status,
        migratedTo,
      })
    }
  }

  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const totalCount = rows.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Form Submissions</h2>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FORM_TABS.map(tab => {
          const params = new URLSearchParams()
          if (tab.value) params.set("form", tab.value)
          if (searchQuery) params.set("search", searchQuery)
          if (fromDate) params.set("from", fromDate)
          if (toDate) params.set("to", toDate)
          return (
            <Link
              key={tab.value}
              href={`/dashboard/form-submissions?${params.toString()}`}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                selectedForm === tab.value
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      <form action="/dashboard/form-submissions" method="GET" className="mb-4 flex flex-wrap gap-3 items-end bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
        {selectedForm ? <input type="hidden" name="form" value={selectedForm} /> : null}
        <div>
          <label className="block text-xs text-zinc-500 mb-1">From</label>
          <input type="date" name="from" defaultValue={fromDate || ""} className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">To</label>
          <input type="date" name="to" defaultValue={toDate || ""} className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm" />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-zinc-500 mb-1">Search</label>
          <input type="text" name="search" defaultValue={searchQuery} placeholder="Search by name, email, subject..." className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm" />
        </div>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Filter</button>
        {(searchQuery || fromDate || toDate || selectedForm) && (
          <Link href={buildHref("", "", "", "", 1)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700">Clear</Link>
        )}
      </form>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Form</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Submitter</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Subject / Field</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">City</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Migrated To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {pageRows.map(r => (
                <tr key={`${r.formType}-${r.id}`} className="text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                  <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap text-xs">
                    {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${FORM_BADGE_COLORS[r.formType]}`}>
                      {FORM_TYPE_LABELS[r.formType]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{r.name}</div>
                    <div className="text-xs text-zinc-500">{r.email}</div>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400 max-w-xs truncate">{r.subject}</td>
                  <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{r.city || "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.formType === "CAREERS" ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300" : r.status === "ACCEPTED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : r.status === "MATCHED" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.migratedTo && (
                      r.migratedTo.href ? (
                        <Link href={r.migratedTo.href} className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block hover:underline ${TONE_COLORS[r.migratedTo.tone]}`}>
                          {r.migratedTo.label}
                        </Link>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block ${TONE_COLORS[r.migratedTo.tone]}`}>
                          {r.migratedTo.label}
                        </span>
                      )
                    )}
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">
                  {searchQuery || fromDate || toDate ? "No submissions match your filters." : "No form submissions yet."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {page > 1 && (
            <Link href={buildHref(selectedForm, searchQuery, fromDate || "", toDate || "", page - 1)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Previous
            </Link>
          )}
          <span className="text-sm text-zinc-500 px-2">Page {page} of {totalPages} ({totalCount} total)</span>
          {page < totalPages && (
            <Link href={buildHref(selectedForm, searchQuery, fromDate || "", toDate || "", page + 1)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
