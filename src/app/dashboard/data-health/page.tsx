import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { GRADE_LABELS, STUDENT_GRADES } from "@/lib/constants"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function DataHealthPage(props: { searchParams: Promise<{ advanced?: string }> }) {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const { advanced } = await props.searchParams

  const checks: Array<{ label: string; status: "ok" | "warn" | "error"; count: number; detail: string; items?: Array<{ name: string; href: string; info: string }> }> = []

  // 1. Hour logs without expenses
  const logsNoExpense = await prisma.hourLog.findMany({
    where: { expense: null },
    include: { tutor: { include: { user: { select: { name: true } } } }, project: { select: { name: true } } },
    take: 20,
  })
  checks.push({
    label: "Hour logs without expense records",
    status: logsNoExpense.length > 0 ? "warn" : "ok",
    count: await prisma.hourLog.count({ where: { expense: null } }),
    detail: logsNoExpense.length > 0 ? "Use Sync Historical Logs on Expenses page" : "All logs have expenses",
    items: logsNoExpense.map(l => ({ name: `${l.tutor.user.name} — ${l.project.name} (${l.hours}h)`, href: "/dashboard/expenses-only", info: new Date(l.date).toLocaleDateString() })),
  })

  // 2. Tutors without active contracts
  const tutorsNoContract = await prisma.tutor.findMany({
    where: { onboarded: true, contract: null },
    include: { user: { select: { name: true, email: true } } },
  })
  checks.push({
    label: "Active tutors without a contract",
    status: tutorsNoContract.length > 0 ? "error" : "ok",
    count: tutorsNoContract.length,
    detail: tutorsNoContract.length > 0 ? "These tutors have no contract" : "All active tutors have contracts",
    items: tutorsNoContract.map(t => ({ name: t.user.name, href: `/dashboard/tutors`, info: t.user.email })),
  })

  // 3. Active contracts without rates
  const contractsNoRates = await prisma.contract.findMany({
    where: { status: "ACTIVE", rates: "{}" },
    include: { tutor: { include: { user: { select: { name: true } } } } },
  })
  checks.push({
    label: "Active contracts without rates",
    status: contractsNoRates.length > 0 ? "error" : "ok",
    count: contractsNoRates.length,
    detail: contractsNoRates.length > 0 ? "These contracts have no rates configured" : "All active contracts have rates",
    items: contractsNoRates.map(c => ({ name: c.tutor.user.name, href: "/dashboard/contracts", info: c.type.replace(/_/g, " ") })),
  })

  // 4. Projects without clients
  const orphanProjects = await prisma.project.findMany({
    where: { clientId: null },
    select: { name: true, id: true },
  })
  checks.push({
    label: "Projects without clients",
    status: orphanProjects.length > 0 ? "warn" : "ok",
    count: orphanProjects.length,
    detail: orphanProjects.length > 0 ? "These projects are not linked to any client" : "All projects have clients",
    items: orphanProjects.map(p => ({ name: p.name, href: `/dashboard/projects/${p.id}`, info: "" })),
  })

  const hasErrors = checks.some(c => c.status === "error")
  const hasWarnings = checks.some(c => c.status === "warn")

  const GRADE_ADVANCE: Record<string, string | null> = {
    ELEMENTARY: "SEC1_2",
    SEC1_2: "SEC3",
    SEC3: "SEC4_5",
    SEC4_5: "CEGEP",
    CEGEP: null,
    UNI: null,
  }
  const advancePreviews: Array<{ currentGrade: string; nextGrade: string; projects: Array<{ id: string; currentName: string; newName: string }> }> = []
  for (const grade of STUDENT_GRADES) {
    const nextGrade = GRADE_ADVANCE[grade]
    if (!nextGrade) continue
    const affected = await prisma.project.findMany({
      where: { gradeLevel: grade, projectType: "STUDENT", status: "IN_PROGRESS" },
      select: { id: true, name: true },
    })
    if (affected.length === 0) continue
    advancePreviews.push({
      currentGrade: grade,
      nextGrade,
      projects: affected.map(p => ({
        id: p.id,
        currentName: p.name,
        newName: p.name.replace(GRADE_LABELS[grade], GRADE_LABELS[nextGrade]),
      })),
    })
  }
  const totalAffected = advancePreviews.reduce((s, g) => s + g.projects.length, 0)

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Data Health</h2>
      <p className="text-sm text-zinc-500 mb-2">
        {hasErrors ? "Issues detected that need attention." : hasWarnings ? "Some items to review." : "Everything looks good."}
      </p>

      {advanced && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-3 text-sm text-green-700 dark:text-green-300">
          Advanced {advanced} project{advanced === "1" ? "" : "s"} to next grade level.
        </div>
      )}

      <div className="mb-4">
        {totalAffected > 0 ? (
          <>
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Grade Advance Preview — {totalAffected} project{totalAffected !== 1 ? "s" : ""} will be updated
            </h3>
            <div className="space-y-2 mb-4">
              {advancePreviews.map(group => (
                <div key={group.currentGrade} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">
                    {GRADE_LABELS[group.currentGrade]} → {GRADE_LABELS[group.nextGrade]} ({group.projects.length} project{group.projects.length !== 1 ? "s" : ""})
                  </p>
                  <ul className="space-y-1">
                    {group.projects.map(p => (
                      <li key={p.id} className="text-xs flex flex-wrap items-center gap-1">
                        <Link href={`/dashboard/projects/${p.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{p.currentName}</Link>
                        {p.currentName !== p.newName && (
                          <>
                            <span className="text-zinc-400">→</span>
                            <span className="text-zinc-500 line-through">{p.newName}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <form action="/api/projects/advance-grades" method="POST" data-confirm={`Advance ${totalAffected} project${totalAffected !== 1 ? "s" : ""} to the next grade level? This will update project names and grades.`}>
              <button type="submit" className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors">
                Approve & Advance All Grades
              </button>
            </form>
          </>
        ) : (
          <p className="text-sm text-zinc-500">No IN_PROGRESS student projects eligible for grade advancement.</p>
        )}
      </div>

      <div className="space-y-3">
        {checks.map(check => (
          <details key={check.label} className={`bg-white dark:bg-zinc-800 rounded-xl border ${
            check.status === "error" ? "border-red-300 dark:border-red-700" :
            check.status === "warn" ? "border-amber-300 dark:border-amber-700" :
            "border-zinc-200 dark:border-zinc-700"
          }`}>
            <summary className="p-4 flex items-center justify-between cursor-pointer list-none">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  check.status === "error" ? "bg-red-500" : check.status === "warn" ? "bg-amber-500" : "bg-green-500"
                }`} />
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{check.label}</p>
                  <p className="text-xs text-zinc-500">{check.detail}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${
                  check.status === "error" ? "text-red-600 dark:text-red-400" :
                  check.status === "warn" ? "text-amber-600 dark:text-amber-400" :
                  "text-green-600 dark:text-green-400"
                }`}>{check.count}</span>
              </div>
            </summary>
            {check.items && check.items.length > 0 && (
              <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-700/50">
                <ul className="mt-3 space-y-1">
                  {check.items.map((item, i) => (
                    <li key={i} className="text-sm flex justify-between">
                      <Link href={item.href} className="text-blue-600 dark:text-blue-400 hover:underline">{item.name}</Link>
                      <span className="text-xs text-zinc-400">{item.info}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </details>
        ))}
      </div>
    </div>
  )
}
