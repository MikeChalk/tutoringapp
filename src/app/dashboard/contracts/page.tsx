import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isSuperAdmin } from "@/lib/auth-helpers"
import { CONTRACT_TYPE_LABELS, TENURE_LABELS } from "@/lib/constants"
import { CityFilter } from "@/components/city-filter"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function ContractsPage(props: { searchParams: Promise<{ city?: string }> }) {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const { city: cityParam } = await props.searchParams
  const selectedCity = cityParam || "all"
  const superAdmin = isSuperAdmin(session.user.role)

  const where: Record<string, unknown> = {}
  if (superAdmin && selectedCity !== "all") {
    where.tutor = { user: { cityId: selectedCity } }
  }

  const contracts = await prisma.contract.findMany({
    where,
    include: {
      tutor: { include: { user: { select: { name: true, email: true, cityId: true } } } },
    },
    orderBy: { tutor: { user: { name: "asc" } } },
  })

  const activeCount = contracts.filter(c => c.status === "ACTIVE").length
  const signedCount = contracts.filter(c => c.signed).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Contracts</h2>
          <p className="text-sm text-zinc-500">{contracts.length} total &middot; {activeCount} active &middot; {signedCount} signed</p>
        </div>
        {superAdmin && <CityFilter selected={selectedCity} />}
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
          <p className="text-zinc-500">No contracts found.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Tutor</th>
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
      )}
    </div>
  )
}
