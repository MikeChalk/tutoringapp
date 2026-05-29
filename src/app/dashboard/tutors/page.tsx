import { prisma } from "@/lib/db"
import Link from "next/link"

const TENURE_LABELS: Record<string, string> = {
  "1ST_YEAR": "Year 1",
  "2ND_YEAR": "Year 2",
  "3RD_YEAR": "Year 3",
}

export default async function TutorsPage() {
  const tutors = await prisma.tutor.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Tutors</h2>
        <Link
          href="/signup"
          className="rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90"
        >
          Add Tutor
        </Link>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Tenure</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Subjects</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {tutors.map((tutor) => (
              <tr key={tutor.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/tutors/${tutor.id}`}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {tutor.user.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {tutor.user.email}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {TENURE_LABELS[tutor.tenure] || tutor.tenure}
                </td>
                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {tutor.subjects || "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${
                      tutor.onboarded
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : tutor.isActive
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                    }`}
                  >
                    {tutor.onboarded ? "Active" : tutor.isActive ? "Waitlist" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
            {tutors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
                  No tutors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
