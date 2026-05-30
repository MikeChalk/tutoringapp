import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isSuperAdmin, isCityAdmin, getActiveCityId } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { CityFilter } from "@/components/city-filter"
import WaitlistTable from "@/components/waitlist-table"

export default async function WaitlistPage(props: { searchParams: Promise<{ city?: string }> }) {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const { city: cityParam } = await props.searchParams
  const selectedCity = cityParam || "all"
  const superAdmin = isSuperAdmin(session.user.role)
  const cityAdminId = isCityAdmin(session.user.role) ? await getActiveCityId(session.user.role, session.user.id) : null
  const effectiveCityId = cityAdminId || (superAdmin && selectedCity !== "all" ? selectedCity : null)

  const whereClause: Record<string, unknown> = { onboarded: false }
  if (effectiveCityId) {
    whereClause.user = { cityId: effectiveCityId }
  }

  const tutors = await prisma.tutor.findMany({
    where: whereClause,
    include: { user: { select: { name: true, email: true, city: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
  })

  const serialized = tutors.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Tutor Waitlist</h2>
        {superAdmin && <CityFilter selected={selectedCity} />}
      </div>

      {tutors.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
          <p className="text-zinc-500">No tutors on the waitlist.</p>
        </div>
      ) : (
        <WaitlistTable tutors={serialized} />
      )}
    </div>
  )
}
