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
      // Create expense under the client
      if (log) {
        const hourLog = await prisma.hourLog.findUnique({
          where: { id },
          include: { project: { select: { clientId: true, name: true } }, tutor: { include: { user: { select: { name: true } } } } },
        })
        if (hourLog?.project?.clientId) {
          await prisma.expense.create({
            data: {
              description: `Tutor payment: ${hourLog.tutor.user.name} — ${hourLog.project.name} (${hourLog.hours}h)`,
              amount: hourLog.hours * hourLog.tutorPayRate,
              category: "TUTOR_PAY",
              date: new Date(),
              clientId: hourLog.project.clientId,
            },
          })
        }
      }
    }
    const referer = request.headers.get("referer") || "/dashboard/expenses"
    return NextResponse.redirect(new URL(referer, request.url), 303)
  }

  // Delete
  await prisma.hourLog.delete({ where: { id } })

  const referer = request.headers.get("referer") || "/dashboard/hours"
  return NextResponse.redirect(new URL(referer, request.url), 303)
}
