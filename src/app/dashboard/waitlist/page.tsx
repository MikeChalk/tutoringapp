import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { TENURE_LABELS } from "@/lib/constants"

export default async function WaitlistPage() {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const tutors = await prisma.tutor.findMany({
    where: { onboarded: false, isActive: true },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Tutor Waitlist</h2>

      {tutors.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
          <p className="text-zinc-500">No tutors on the waitlist.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Year</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Subjects</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {tutors.map((tutor) => (
                <tr key={tutor.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/tutors/${tutor.id}`} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      {tutor.user.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{tutor.user.email}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{TENURE_LABELS[tutor.tenure] || tutor.tenure}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{tutor.subjects || "-"}</td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{new Date(tutor.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
