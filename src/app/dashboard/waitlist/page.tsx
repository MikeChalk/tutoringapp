import { prisma } from "@/lib/db"
import { requireAdmin, isSuperAdmin, isCityAdmin, getActiveCityId } from "@/lib/auth-helpers"
import { CityFilter } from "@/components/city-filter"
import WaitlistTable from "@/components/waitlist-table"
import Link from "next/link"

export default async function WaitlistPage(props: { searchParams: Promise<{ city?: string; search?: string; page?: string }> }) {
  const session = await requireAdmin()

  const { city: cityParam, search: searchParam, page: pageParam } = await props.searchParams
  const selectedCity = cityParam || "all"
  const searchQuery = searchParam || ""
  const page = parseInt(pageParam || "1") || 1
  const pageSize = 50
  const superAdmin = isSuperAdmin(session.user.role)
  const cityAdminId = isCityAdmin(session.user.role) ? await getActiveCityId(session.user.role, session.user.id) : null
  const effectiveCityId = cityAdminId || (superAdmin && selectedCity !== "all" ? selectedCity : null)

  const whereClause: Record<string, unknown> = { onboarded: false }
  if (effectiveCityId) {
    whereClause.user = { cityId: effectiveCityId }
  }
  if (searchQuery) {
    whereClause.user = {
      ...(whereClause.user as Record<string, unknown> || {}),
      OR: [
        { name: { contains: searchQuery } },
        { email: { contains: searchQuery } },
      ],
    }
  }

  const [tutors, totalCount] = await Promise.all([
    prisma.tutor.findMany({
      where: whereClause,
      include: { user: { select: { name: true, email: true, city: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tutor.count({ where: whereClause }),
  ])
  const totalPages = Math.ceil(totalCount / pageSize)

  const serialized = tutors.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }))

  function buildPageUrl(p: number) {
    const params = new URLSearchParams()
    if (searchQuery) params.set("search", searchQuery)
    if (selectedCity !== "all") params.set("city", selectedCity)
    params.set("page", String(p))
    return `/dashboard/waitlist?${params.toString()}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Tutor Waitlist</h2>
        {superAdmin && <CityFilter selected={selectedCity} />}
      </div>

      <form action="/dashboard/waitlist" method="GET" className="mb-4 flex gap-2">
        {selectedCity !== "all" ? <input type="hidden" name="city" value={selectedCity} /> : null}
        <input type="text" name="search" defaultValue={searchQuery} placeholder="Search by name or email..."
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Search</button>
        {searchQuery && <Link href={`/dashboard/waitlist${selectedCity !== "all" ? `?city=${selectedCity}` : ""}`} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700">Clear</Link>}
      </form>

      {tutors.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
          <p className="text-zinc-500">{searchQuery ? "No tutors match your search." : "No tutors on the waitlist."}</p>
        </div>
      ) : (
        <WaitlistTable tutors={serialized} />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {page > 1 && (
            <Link href={buildPageUrl(page - 1)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Previous
            </Link>
          )}
          <span className="text-sm text-zinc-500 px-2">Page {page} of {totalPages} ({totalCount} total)</span>
          {page < totalPages && (
            <Link href={buildPageUrl(page + 1)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}