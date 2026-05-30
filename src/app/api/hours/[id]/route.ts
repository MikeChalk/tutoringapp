import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getTutorId } from "@/lib/auth-helpers"
import { logActivity } from "@/lib/activity"

async function canModify(session: { user?: { id: string; role: string } } | null, hourLogId: string): Promise<boolean> {
  if (!session?.user) return false
  if (isAdmin(session.user.role)) return true

  const tutorId = await getTutorId(session.user.id, (session.user as { email?: string }).email || "")
  if (!tutorId) return false

  const log = await prisma.hourLog.findUnique({ where: { id: hourLogId }, select: { tutorId: true } })
  return log?.tutorId === tutorId
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const { id } = await params

  if (!(await canModify(session, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const action = formData.get("_action") as string

  if (action === "pay") {
    const log = await prisma.hourLog.findUnique({ where: { id } })
    if (log?.paidAt) {
      await prisma.hourLog.update({ where: { id }, data: { paidAt: null } })
      await logActivity(session!.user!.id, "unpaid", "HourLog", id)
    } else {
      await prisma.hourLog.update({ where: { id }, data: { paidAt: new Date() } })
      await logActivity(session!.user!.id, "paid", "HourLog", id)
    }
    const referer = request.headers.get("referer") || "/dashboard/expenses"
    return NextResponse.redirect(new URL(referer, request.url), 303)
  }

  if (action === "edit") {
    const hours = parseFloat((formData.get("hours") as string) || "0")
    const date = formData.get("date") as string
    const mode = (formData.get("mode") as string) || "IN_PERSON"
    const description = formData.get("description") as string
    const billingRate = parseFloat((formData.get("billingRate") as string) || "0")
    const tutorPayRate = parseFloat((formData.get("tutorPayRate") as string) || "0")

    if (!date || !hours) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    await prisma.hourLog.update({
      where: { id },
      data: { hours, date: new Date(date), mode, description: description || null, billingRate, tutorPayRate },
    })

    const log = await prisma.hourLog.findUnique({
      where: { id },
      include: { tutor: { include: { user: { select: { name: true } } } }, project: { select: { name: true, clientId: true, cityId: true } } },
    })
    if (log) {
      const expenseAmount = hours * tutorPayRate
      await prisma.expense.upsert({
        where: { hourLogId: id },
        create: {
          description: `Tutor: ${log.tutor.user.name} — ${log.project.name} (${hours}h)`,
          amount: expenseAmount,
          category: "TUTOR_PAY",
          date: new Date(date),
          clientId: log.project.clientId,
          cityId: log.project.cityId,
          hourLogId: id,
        },
        update: {
          description: `Tutor: ${log.tutor.user.name} — ${log.project.name} (${hours}h)`,
          amount: expenseAmount,
          date: new Date(date),
          clientId: log.project.clientId,
          cityId: log.project.cityId,
        },
      })
    }

    await logActivity(session!.user!.id, "edited", "HourLog", id, `${hours}h, $${tutorPayRate}/h`)
    const referer = request.headers.get("referer") || "/dashboard/hours"
    return NextResponse.redirect(new URL(referer, request.url), 303)
  }

  // Delete hour log + corresponding expense
  await prisma.expense.deleteMany({ where: { hourLogId: id } })
  await prisma.hourLog.delete({ where: { id } })
  await logActivity(session!.user!.id, "deleted", "HourLog", id)

  const referer = request.headers.get("referer") || "/dashboard/hours"
  return NextResponse.redirect(new URL(referer, request.url), 303)
}
