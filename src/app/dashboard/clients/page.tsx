import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, getTutorId, isSuperAdmin, isCityAdmin, getActiveCityId } from "@/lib/auth-helpers"
import { CityFilter } from "@/components/city-filter"
import { CLIENT_TYPE_LABELS } from "@/lib/constants"
import Link from "next/link"

const TYPE_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "PARENT", label: "Parents" },
  { value: "SCHOOL", label: "Schools" },
]

function buildHref(typeValue: string, cityValue: string) {
  const params = new URLSearchParams()
  if (typeValue !== "ALL") params.set("type", typeValue)
  if (cityValue !== "all") params.set("city", cityValue)
  const qs = params.toString()
  return `/dashboard/clients${qs ? `?${qs}` : ""}`
}

export default async function ClientsPage(props: { searchParams: Promise<{ type?: string; city?: string }> }) {
  const session = await requireAuth()
  const admin = isAdmin(session.user.role)
  const tutor = isTutor(session.user.role)

  const { type: typeParam, city: cityParam } = await props.searchParams
  const typeFilter = typeParam || "ALL"
  const selectedCity = cityParam || "all"
  const cityAdminId = isCityAdmin(session.user.role) ? await getActiveCityId(session.user.role, session.user.id) : null
  const effectiveCityId = cityAdminId || (isSuperAdmin(session.user.role) && selectedCity !== "all" ? selectedCity : null)

  let whereClause: Record<string, unknown> = {}
  if (tutor) {
    const tutorId = await getTutorId(session.user.id, session.user.email)
    if (tutorId) {
      whereClause = { projects: { some: { projectTutors: { some: { tutorId } } } } }
    }
  }

  if (typeFilter !== "ALL") {
    whereClause = { ...whereClause, type: typeFilter }
  }

  if (effectiveCityId) {
    whereClause = { ...whereClause, user: { cityId: effectiveCityId } }
  }

  const clients = await prisma.client.findMany({
    where: whereClause,
    include: {
      user: { select: { name: true, email: true, city: { select: { name: true } } } },
      projects: { select: { id: true } },
      invoices: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const cities = admin ? await prisma.city.findMany({ select: { id: true, name: true } }) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Clients</h2>
        {isSuperAdmin(session.user.role) && <CityFilter selected={selectedCity} />}
      </div>

      <div className="flex gap-2 mb-6">
        {TYPE_FILTERS.map((f) => (
          <Link key={f.value} href={buildHref(f.value, selectedCity)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${typeFilter === f.value ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}>
            {f.label}
          </Link>
        ))}
      </div>

      {admin && (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Add Client</h3>
          <form action="/api/clients" method="POST" className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Name *</label>
              <input type="text" name="name" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Email *</label>
              <input type="email" name="email" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Type</label>
              <select name="clientType" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="PARENT">Parent</option>
                <option value="SCHOOL">School</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Company</label>
              <input type="text" name="company" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Phone</label>
              <input type="text" name="phone" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">City</label>
              <select name="cityId" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">None</option>
                {cities.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              Add Client
            </button>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">City</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Company</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Projects</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Invoices</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {client.user.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {client.user.email}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {client.user.city?.name || "-"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${
                    client.type === "SCHOOL" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}>
                    {CLIENT_TYPE_LABELS[client.type] || client.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {client.company || "-"}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {client.projects.length}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {client.invoices.length}
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-zinc-500">
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
