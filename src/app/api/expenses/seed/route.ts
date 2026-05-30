import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find all expense hourLogIds to know which hour logs already have expenses
  const existingExpenses = await prisma.expense.findMany({
    where: { hourLogId: { not: null } },
    select: { hourLogId: true },
  })
  const existingIds = new Set(existingExpenses.map(e => e.hourLogId))

  // Find all hour logs that don't have a corresponding expense
  const hourLogs = await prisma.hourLog.findMany({
    include: {
      tutor: { include: { user: { select: { name: true } } } },
      project: { select: { name: true, clientId: true, cityId: true } },
    },
  })

  let created = 0
  for (const log of hourLogs) {
    if (existingIds.has(log.id)) continue
    if (!log.project.clientId) continue
    await prisma.expense.create({
      data: {
        description: `Tutor: ${log.tutor.user.name} — ${log.project.name} (${log.hours}h)`,
        amount: log.hours * log.tutorPayRate,
        category: "TUTOR_PAY",
        date: log.date,
        clientId: log.project.clientId,
        cityId: log.project.cityId,
        hourLogId: log.id,
      },
    })
    created++
  }

  return NextResponse.redirect(new URL(`/dashboard/expenses-only?synced=${created}`, request.url), 303)
}
