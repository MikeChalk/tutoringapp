import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import { logActivity } from "@/lib/activity"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const formData = await request.formData()
  const action = formData.get("_action") as string

  if (action === "pay") {
    const log = await prisma.hourLog.findUnique({ where: { id } })
    if (log?.paidAt) {
      await prisma.hourLog.update({ where: { id }, data: { paidAt: null } })
      await logActivity(session.user.id, "unpaid", "HourLog", id)
    } else {
      await prisma.hourLog.update({ where: { id }, data: { paidAt: new Date() } })
      await logActivity(session.user.id, "paid", "HourLog", id)
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
      data: {
        hours,
        date: new Date(date),
        mode,
        description: description || null,
        billingRate,
        tutorPayRate,
      },
    })

    // Sync the corresponding expense
    const log = await prisma.hourLog.findUnique({
      where: { id },
      include: { tutor: { include: { user: { select: { name: true } } } }, project: { select: { name: true, clientId: true } } },
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
          hourLogId: id,
        },
        update: {
          description: `Tutor: ${log.tutor.user.name} — ${log.project.name} (${hours}h)`,
          amount: expenseAmount,
          date: new Date(date),
        },
      })
    }

    await logActivity(session.user.id, "edited", "HourLog", id, `${hours}h, $${tutorPayRate}/h`)
    const referer = request.headers.get("referer") || "/dashboard/hours"
    return NextResponse.redirect(new URL(referer, request.url), 303)
  }

  // Delete hour log + corresponding expense
  await prisma.expense.deleteMany({ where: { hourLogId: id } })
  await prisma.hourLog.delete({ where: { id } })
  await logActivity(session.user.id, "deleted", "HourLog", id)

  const referer = request.headers.get("referer") || "/dashboard/hours"
  return NextResponse.redirect(new URL(referer, request.url), 303)
}
