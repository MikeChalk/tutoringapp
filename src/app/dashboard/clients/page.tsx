import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, getTutorId, isSuperAdmin } from "@/lib/auth-helpers"
import { CityFilter } from "@/components/city-filter"
import Link from "next/link"

export default async function ClientsPage(props: { searchParams: Promise<{ city?: string }> }) {
  const session = await requireAuth()
  const admin = isAdmin(session.user.role)
  const tutor = isTutor(session.user.role)

  const { city: cityParam } = await props.searchParams
  const selectedCity = cityParam || "all"

  let whereClause: Record<string, unknown> = {}
  if (tutor) {
    const tutorId = await getTutorId(session.user.id, session.user.email)
    if (tutorId) {
      whereClause = { projects: { some: { projectTutors: { some: { tutorId } } } } }
    }
  }

  if (isSuperAdmin(session.user.role) && selectedCity !== "all") {
    whereClause = { ...whereClause, user: { cityId: selectedCity } }
  }

  const clients = await prisma.client.findMany({
    where: whereClause,
    include: {
      user: { select: { name: true, email: true } },
      projects: { select: { id: true } },
      invoices: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Clients</h2>
        {isSuperAdmin(session.user.role) && <CityFilter selected={selectedCity} />}
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Email</th>
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
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
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
