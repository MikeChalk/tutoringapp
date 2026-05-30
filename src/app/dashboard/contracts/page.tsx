import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isSuperAdmin, isCityAdmin, getActiveCityId } from "@/lib/auth-helpers"
import { CONTRACT_TYPE_LABELS, TENURE_LABELS, GRADE_LABELS } from "@/lib/constants"
import { ContractTemplateForm } from "@/components/contract-template-form"
import { CityFilter } from "@/components/city-filter"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function ContractsPage(props: { searchParams: Promise<{ tab?: string; city?: string; edit?: string; search?: string; page?: string }> }) {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const { tab, city: cityParam, edit: editId, search: searchParam, page: pageParam } = await props.searchParams
  const activeTab = tab || "contracts"
  const selectedCity = cityParam || "all"
  const searchQuery = searchParam || ""
  const page = parseInt(pageParam || "1") || 1
  const pageSize = 50
  const superAdmin = isSuperAdmin(session.user.role)
  const cityAdminId = isCityAdmin(session.user.role) ? await getActiveCityId(session.user.role, session.user.id) : null
  const effectiveCityId = cityAdminId || (superAdmin && selectedCity !== "all" ? selectedCity : null)

  const where: Record<string, unknown> = {}
  if (effectiveCityId) {
    where.tutor = { user: { cityId: effectiveCityId } }
  }
  if (searchQuery) {
    where.tutor = {
      ...(where.tutor as Record<string, unknown> || {}),
      OR: [
        { user: { name: { contains: searchQuery } } },
        { user: { email: { contains: searchQuery } } },
      ],
    }
  }

  const [contracts, totalCount] = await Promise.all([
    prisma.contract.findMany({
      where,
      include: {
        tutor: { include: { user: { select: { name: true, email: true, city: { select: { name: true } } } } } },
      },
      orderBy: { tutor: { user: { name: "asc" } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contract.count({ where }),
  ])

  const templates = await prisma.contractTemplate.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  })

  const editingTemplate = editId
    ? templates.find(t => t.id === editId) || null
    : null

  const tutors = await prisma.tutor.findMany({
    where: { onboarded: true, ...(effectiveCityId ? { user: { cityId: effectiveCityId } } : {}) },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  })

  const activeCount = contracts.filter(c => c.status === "ACTIVE").length
  const signedCount = contracts.filter(c => c.signed).length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Contracts</h2>
          <p className="text-sm text-zinc-500">{contracts.length} total &middot; {activeCount} active &middot; {signedCount} signed</p>
        </div>
        {superAdmin && <CityFilter selected={selectedCity} />}
      </div>

      <form action="/dashboard/contracts" method="GET" className="mb-4 flex gap-2">
        <input type="hidden" name="tab" value={activeTab} />
        {selectedCity !== "all" ? <input type="hidden" name="city" value={selectedCity} /> : null}
        <input type="text" name="search" defaultValue={searchQuery} placeholder="Search by tutor name or email..."
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Search</button>
        {searchQuery && <Link href={`/dashboard/contracts?tab=${activeTab}${selectedCity !== "all" ? `&city=${selectedCity}` : ""}`} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700">Clear</Link>}
      </form>

      <div className="flex gap-2 mb-6">
        {[
          { value: "contracts", label: "Contracts" },
          { value: "templates", label: "Templates" },
        ].map((t) => {
          const params = new URLSearchParams()
          params.set("tab", t.value)
          if (selectedCity !== "all") params.set("city", selectedCity)
          return (
            <Link key={t.value} href={`/dashboard/contracts?${params.toString()}`}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${activeTab === t.value ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}>
              {t.label}
            </Link>
          )
        })}
      </div>

      {activeTab === "templates" ? (
        <TemplatesTab templates={templates} editingTemplate={editingTemplate} />
      ) : (
        <ContractsTab contracts={contracts} tutors={tutors} totalCount={totalCount} page={page} pageSize={pageSize} searchQuery={searchQuery} selectedCity={selectedCity} activeTab={activeTab} />
      )}
    </div>
  )
}

function ContractsTab({ contracts, tutors, totalCount, page, pageSize, searchQuery, selectedCity, activeTab }: {
  contracts: Array<{
    id: string; tutorId: string; type: string; yearLevel: string;
    startDate: Date; endDate: Date; signed: boolean; signedAt: Date | null; status: string;
    tutor: { user: { name: string; email: string; city: { name: string } | null } };
  }>;
  tutors: Array<{ id: string; user: { name: string } }>;
  totalCount: number;
  page: number;
  pageSize: number;
  searchQuery: string;
  selectedCity: string;
  activeTab: string;
}) {
  const today = new Date()
  const nextJuly1 = today < new Date(today.getFullYear(), 6, 1)
    ? new Date(today.getFullYear(), 6, 1)
    : new Date(today.getFullYear() + 1, 6, 1)
  const endDateDefault = nextJuly1.toISOString().split("T")[0]

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Create Contract</h3>
        <form action="/api/contracts" method="POST" className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Tutor</label>
            <select name="tutorId" required
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select tutor</option>
              {tutors.map(t => (
                <option key={t.id} value={t.id}>{t.user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Contract Type</label>
            <select name="type" required
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="PRIVATE_TUTORING">Private Tutoring</option>
            <option value="STUDY_HALL">Study Hall</option>
            <option value="PROGRAM_SUPERVISOR">Program Supervisor</option>
          </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Year Level</label>
            <select name="yearLevel" required
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="1ST_YEAR">Year 1</option>
              <option value="2ND_YEAR">Year 2</option>
              <option value="3RD_YEAR">Year 3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Start Date</label>
            <input type="date" name="startDate" required
              defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">End Date</label>
            <input type="date" name="endDate" required
              defaultValue={endDateDefault}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-3 lg:col-span-5">
            <label className="block text-xs text-zinc-500 mb-1">Terms</label>
            <textarea name="terms" rows={2} placeholder="Contract terms (leave blank for default)."
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            Create Contract
          </button>
        </form>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
          <p className="text-zinc-500">No contracts found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Tutor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">City</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Year</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Start</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">End</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Signed</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/tutors/${c.tutorId}`} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      {c.tutor.user.name}
                    </Link>
                    <p className="text-xs text-zinc-400">{c.tutor.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {c.tutor.user.city?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {CONTRACT_TYPE_LABELS[c.type] || c.type}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {TENURE_LABELS[c.yearLevel] || c.yearLevel}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {new Date(c.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {new Date(c.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.signed ? (
                      <span className="inline-flex text-xs font-medium rounded-full px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {c.signedAt ? new Date(c.signedAt).toLocaleDateString() : "Yes"}
                      </span>
                    ) : (
                      <span className="inline-flex text-xs font-medium rounded-full px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Unsigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${
                      c.status === "ACTIVE"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
}`}>
                      {c.status}
                    </span>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
          </div>
         </div>
      )}
      {(() => { const tp = Math.ceil(totalCount / pageSize); return tp > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={`/dashboard/contracts?page=${page - 1}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}${selectedCity !== "all" ? `&city=${selectedCity}` : ""}&tab=${activeTab}`}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Previous
            </Link>
          )}
          <span className="text-sm text-zinc-500 px-2">Page {page} of {tp} ({totalCount} total)</span>
          {page < tp && (
            <Link href={`/dashboard/contracts?page=${page + 1}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}${selectedCity !== "all" ? `&city=${selectedCity}` : ""}&tab=${activeTab}`}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Next
            </Link>
          )}
        </div>
      ) : null })()}
    </div>
  )
}

function TemplatesTab({ templates, editingTemplate }: { templates: Array<{
  id: string; name: string; type: string; yearLevel: string;
  startDate: Date | null; endDate: Date | null;
  terms: string; gradeLevels: string; rates: string; isDefault: boolean;
}>; editingTemplate: typeof templates[number] | null }) {

  return (
    <div className="space-y-6">
      <ContractTemplateForm editing={editingTemplate} onCancel="/dashboard/contracts?tab=templates" />

      {templates.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
          <p className="text-zinc-500">No contract templates yet. Create one above.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Year</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Grades</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Rate</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Default</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.name}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {CONTRACT_TYPE_LABELS[t.type] || t.type}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {TENURE_LABELS[t.yearLevel] || t.yearLevel}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {t.gradeLevels ? t.gradeLevels.split(",").map(g => GRADE_LABELS[g.trim()] || g.trim()).join(", ") : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-zinc-600 dark:text-zinc-400">
                    {(() => {
                      try {
                        const r = JSON.parse(t.rates)
                        const count = Object.keys(r).filter(k => k !== "custom").length
                        const custom = (r.custom as Array<{ label: string }>)?.length || 0
                        const total = count + custom
                        return total > 0 ? `${total} categories` : "-"
                      } catch { return "-" }
                    })()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.isDefault && (
                      <span className="inline-flex text-xs font-medium rounded-full px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Default
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Link href={`/dashboard/contracts?tab=templates&edit=${t.id}`}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        Edit
                      </Link>
                      <form action={`/api/contract-templates/${t.id}`} method="POST">
                        <input type="hidden" name="_method" value="DELETE" />
                        <button type="submit" className="text-xs text-red-600 dark:text-red-400 hover:underline">Delete</button>
                      </form>
                    </div>
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
