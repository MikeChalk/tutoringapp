import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, isClient, getClientId, getTutorId, isSuperAdmin, isCityAdmin, getActiveCityId } from "@/lib/auth-helpers"
import { CityFilter } from "@/components/city-filter"
import { CLIENT_TYPE_LABELS } from "@/lib/constants"
import { AddClientForm } from "@/components/add-client-form"
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

export default async function ClientsPage(props: { searchParams: Promise<{ type?: string; city?: string; page?: string }> }) {
  const session = await requireAuth()
  const admin = isAdmin(session.user.role)
  const tutor = isTutor(session.user.role)

  const { type: typeParam, city: cityParam, page: pageParam } = await props.searchParams
  const typeFilter = typeParam || "ALL"
  const selectedCity = cityParam || "all"
  const page = parseInt(pageParam || "1") || 1
  const pageSize = 50
  const cityAdminId = isCityAdmin(session.user.role) ? await getActiveCityId(session.user.role, session.user.id) : null
  const effectiveCityId = cityAdminId || (isSuperAdmin(session.user.role) && selectedCity !== "all" ? selectedCity : null)

  let whereClause: Record<string, unknown> = {}
  if (tutor) {
    const tutorId = await getTutorId(session.user.id, session.user.email)
    if (tutorId) {
      whereClause = { projects: { some: { projectTutors: { some: { tutorId } } } } }
    }
  } else if (isClient(session.user.role)) {
    const clientId = await getClientId(session.user.id, session.user.email)
    if (clientId) {
      whereClause = { id: clientId }
    }
  }

  if (typeFilter !== "ALL") {
    whereClause = { ...whereClause, type: typeFilter }
  }

  if (effectiveCityId) {
    whereClause = { ...whereClause, user: { cityId: effectiveCityId } }
  }

  const [clients, totalCount] = await Promise.all([
    prisma.client.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true, city: { select: { name: true } } } },
        _count: { select: { projects: true, invoices: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.count({ where: whereClause }),
  ])
  const totalPages = Math.ceil(totalCount / pageSize)

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

      {admin && <AddClientForm />}

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">City</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Type</th>
              {admin && <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Company</th>}
              {admin && <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Projects</th>}
              {admin && <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Invoices</th>}
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
                {admin && <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {client.company || "-"}
                </td>}
                {admin && <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {client._count.projects}
                </td>}
                {admin && <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {client._count.invoices}
                </td>}
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={admin ? 7 : 4} className="px-4 py-8 text-center text-sm text-zinc-500">
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {page > 1 && (
            <a href={`/dashboard/clients?page=${page - 1}${typeFilter !== "ALL" ? `&type=${typeFilter}` : ""}${selectedCity !== "all" ? `&city=${selectedCity}` : ""}`}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Previous
            </a>
          )}
          <span className="text-sm text-zinc-500 px-2">Page {page} of {totalPages} ({totalCount} total)</span>
          {page < totalPages && (
            <a href={`/dashboard/clients?page=${page + 1}${typeFilter !== "ALL" ? `&type=${typeFilter}` : ""}${selectedCity !== "all" ? `&city=${selectedCity}` : ""}`}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Next
            </a>
          )}
        </div>
      )}
    </div>
  )
}
