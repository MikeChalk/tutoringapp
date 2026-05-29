import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isSuperAdmin, isCityAdmin, getActiveCityId } from "@/lib/auth-helpers"
import { TENURE_LABELS, CONTRACT_TYPE_LABELS, GRADE_LABELS } from "@/lib/constants"
import { CityFilter } from "@/components/city-filter"
import { AddTutorForm } from "@/components/add-tutor-form"
import { redirect } from "next/navigation"
import Link from "next/link"

const TYPE_FILTERS = [
  { value: "ALL", label: "All" },
  { value: "PRIVATE_TUTORING", label: "Tutors" },
  { value: "PROGRAM_SUPERVISOR", label: "Program Supervisors" },
  { value: "CITY_ADMIN", label: "City Admins" },
]

function buildHref(typeValue: string, cityValue: string) {
  const params = new URLSearchParams()
  if (typeValue !== "ALL") params.set("type", typeValue)
  if (cityValue !== "all") params.set("city", cityValue)
  const qs = params.toString()
  return `/dashboard/tutors${qs ? `?${qs}` : ""}`
}

export default async function TutorsPage(props: { searchParams: Promise<{ type?: string; city?: string }> }) {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const { type, city: cityParam } = await props.searchParams
  const filter = type || "ALL"
  const selectedCity = cityParam || "all"
  const superAdmin = isSuperAdmin(session.user.role)
  const cityAdminId = isCityAdmin(session.user.role) ? await getActiveCityId(session.user.role, session.user.id) : null
  const effectiveCityId = cityAdminId || (superAdmin && selectedCity !== "all" ? selectedCity : null)

  if (filter === "CITY_ADMIN") {
    const cityAdmins = await prisma.user.findMany({
      where: { role: "CITY_ADMIN", ...(effectiveCityId ? { cityId: effectiveCityId } : {}) },
      include: { city: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Team</h2>
        <div className="flex items-center gap-4">
          <a href="/api/export?type=tutors" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Export CSV</a>
          {superAdmin && <CityFilter selected={selectedCity} />}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {TYPE_FILTERS.map((f) => (
          <Link key={f.value} href={buildHref(f.value, selectedCity)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${filter === f.value ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}>
            {f.label}
          </Link>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">City</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Role</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {cityAdmins.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                  <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">{u.name}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{u.city?.name || "-"}</td>
                  <td className="px-4 py-3"><span className="inline-flex text-xs font-medium rounded-full px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">City Admin</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const contractFilter = filter !== "ALL" ? { type: filter, status: "ACTIVE" } : undefined
  const baseWhere: Record<string, unknown> = contractFilter ? { contract: contractFilter, onboarded: true } : { onboarded: true }
  if (effectiveCityId) {
    baseWhere.user = { cityId: effectiveCityId }
  }

  const cities = await prisma.city.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })

  const tutors = await prisma.tutor.findMany({
    where: baseWhere,
    include: {
      user: { select: { name: true, email: true, city: { select: { name: true } } } },
      contract: { select: { type: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Team</h2>
        <div className="flex items-center gap-4">
          <a href="/api/export?type=tutors" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Export CSV</a>
          {superAdmin && <CityFilter selected={selectedCity} />}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {TYPE_FILTERS.map((f) => (
          <Link key={f.value} href={buildHref(f.value, selectedCity)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${filter === f.value ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"}`}>
            {f.label}
          </Link>
        ))}
      </div>

      <AddTutorForm templates={[]} cities={cities} />

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full">
          <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">City</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Tenure</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Grades</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Subjects</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {tutors.map((tutor) => (
                <tr key={tutor.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/tutors/${tutor.id}`} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">{tutor.user.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{tutor.user.email}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{tutor.user.city?.name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{TENURE_LABELS[tutor.tenure] || tutor.tenure}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{CONTRACT_TYPE_LABELS[tutor.contract?.type || ""] || tutor.contract?.type || "—"}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{tutor.gradeLevels ? tutor.gradeLevels.split(",").map(g => GRADE_LABELS[g] || g).join(", ") : "-"}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{tutor.subjects || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
