import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"

export default async function OnboardingPage() {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const pendingTutors = await prisma.tutor.findMany({
    where: { onboarded: false, isActive: true },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  })

  const onboardedTutors = await prisma.tutor.findMany({
    where: { onboarded: true },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { onboardedAt: "desc" },
  })

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Onboarding</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Pending Onboarding ({pendingTutors.length})
          </h3>
          {pendingTutors.length === 0 ? (
            <p className="text-sm text-zinc-500">All tutors are onboarded.</p>
          ) : (
            <div className="space-y-3">
              {pendingTutors.map((tutor) => (
                <div
                  key={tutor.id}
                  className="flex items-center justify-between border border-zinc-200 dark:border-zinc-700 rounded-lg p-4"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {tutor.user.name}
                    </p>
                    <p className="text-sm text-zinc-500">{tutor.user.email}</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Joined {new Date(tutor.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <form action="/api/onboarding" method="POST">
                    <input type="hidden" name="tutorId" value={tutor.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                    >
                      Complete Onboarding
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Onboarded Tutors ({onboardedTutors.length})
          </h3>
          {onboardedTutors.length === 0 ? (
            <p className="text-sm text-zinc-500">No tutors onboarded yet.</p>
          ) : (
            <div className="space-y-3">
              {onboardedTutors.map((tutor) => (
                <div
                  key={tutor.id}
                  className="flex items-center justify-between border border-zinc-200 dark:border-zinc-700 rounded-lg p-4"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {tutor.user.name}
                    </p>
                    <p className="text-sm text-zinc-500">{tutor.user.email}</p>
                    {tutor.onboardedAt && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Onboarded {new Date(tutor.onboardedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-full px-2 py-0.5">
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
