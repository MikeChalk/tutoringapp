import { prisma } from "@/lib/db"
import { requireAuth, getTutorId } from "@/lib/auth-helpers"
import TutorWelcome from "@/components/tutor-welcome"
import TutorDashboardContent from "@/components/tutor-dashboard-content"
import { computeGreeting, getMontrealNow, getMontrealInfo, getMondayOfWeek, getMontrealTodayStr } from "@/lib/greeting"
import { cookies } from "next/headers"

function getNextPayoutDate(): Date {
  const now = getMontrealNow()
  if (now.getDate() === 1) {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return new Date(now.getFullYear(), now.getMonth() + 1, 1)
}

function formatPayoutDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function TutorDashboard() {
  const session = await requireAuth()
  const tutorId = await getTutorId(session.user.id, session.user.email)
  if (!tutorId) return null

  const firstName = session.user.name?.split(" ")[0] || "there"

  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId } })

  const [user, contract, hourLogs, projects, payScales] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { firstLoginAt: true } }),
    prisma.contract.findFirst({
      where: { tutorId, status: "ACTIVE" },
      select: { id: true, signed: true, rates: true, type: true },
    }),
    prisma.hourLog.findMany({
      where: { tutorId },
      select: { hours: true, tutorPayRate: true, paidAt: true, date: true },
    }),
    prisma.project.findMany({
      where: { projectTutors: { some: { tutorId } } },
      include: {
        client: { select: { user: { select: { name: true } }, type: true } },
        projectTutors: { include: { tutor: { include: { user: { select: { name: true, id: true } } } } } },
      },
    }),
    prisma.payScale.findMany({
      where: { tenure: tutor?.tenure || "1ST_YEAR" },
    }),
  ])

  const isFirstLogin = user?.firstLoginAt === null
  if (isFirstLogin) {
    await prisma.user.update({ where: { id: session.user.id }, data: { firstLoginAt: new Date() } })
  }

  const montrealNow = getMontrealNow()
  const { hour: localHour, dayOfWeek: localDayOfWeek } = getMontrealInfo()
  const weekStart = getMondayOfWeek(montrealNow)

  const cookieStore = await cookies()
  const lastWelcomeDate = cookieStore.get("lastWelcomeDate")?.value
  const lastGreeting = cookieStore.get("lastGreeting")?.value ?? null
  const todayStr = getMontrealTodayStr()
  const welcomeMode: "full" | "brief" = lastWelcomeDate === todayStr ? "brief" : "full"

  const sessionsThisWeek = hourLogs.filter((h) => new Date(h.date) >= weekStart).length

  const daysSinceLastSession: number | null = hourLogs.length > 0
    ? Math.floor((montrealNow.getTime() - Math.max(...hourLogs.map((h) => new Date(h.date).getTime()))) / (1000 * 60 * 60 * 24))
    : null

  const greeting = computeGreeting({
    firstName,
    isFirstLogin,
    sessionsThisWeek,
    daysSinceLastSession,
    localHour,
    localDayOfWeek,
  }, lastGreeting)

  const contractRates: Record<string, number> = contract?.rates
    ? (() => { try { return JSON.parse(contract.rates) } catch { return {} } })()
    : {}

  const payScaleMap: Record<string, number> = {}
  for (const ps of payScales) {
    const key = ps.projectType === "STUDENT"
      ? `${ps.gradeLevel}|${ps.mode}`
      : `${ps.gradeLevel}|${ps.mode}|${ps.projectType}`
    payScaleMap[key] = ps.rate
  }

  const totalEarned = hourLogs.reduce((sum, h) => sum + h.hours * h.tutorPayRate, 0)
  const totalPaid = hourLogs.filter((h) => h.paidAt).reduce((sum, h) => sum + h.hours * h.tutorPayRate, 0)
  const totalUnpaid = totalEarned - totalPaid

  const payoutDate = getNextPayoutDate()

  const contractSigned = contract ? contract.signed : false
  const onboardingComplete = tutor?.onboarded ?? false
  const defaultProjectType = contract?.type === "PROGRAM_SUPERVISOR" ? "STUDY_HALL" : "STUDENT"

  return (
    <>
      <TutorWelcome
        greeting={greeting}
        welcomeMode={welcomeMode}
        todayStr={todayStr}
      />
      <TutorDashboardContent
        greeting={greeting}
        subline="Just finished a session? Log it below."
        projects={projects}
        tutorId={tutorId}
        contractRates={contractRates}
        payScaleMap={payScaleMap}
        defaultProjectType={defaultProjectType}
        initialTotalPaid={totalPaid}
        initialTotalUnpaid={totalUnpaid}
        payoutDateStr={formatPayoutDate(payoutDate)}
        contractSigned={contractSigned}
        onboardingComplete={onboardingComplete}
      />
    </>
  )
}