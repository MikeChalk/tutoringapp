import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const hourLogs = await prisma.hourLog.findMany({
    where: { expense: null },
    include: {
      tutor: { include: { user: { select: { name: true } } } },
      project: { select: { name: true, clientId: true, cityId: true } },
    },
  })

  let created = 0
  for (const log of hourLogs) {
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
