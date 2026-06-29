import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, isSuperAdmin, getTutorId, getCityAccessScope, assertInScope, safeReferer } from "@/lib/auth-helpers"
import { logActivity } from "@/lib/activity"

async function canModify(session: { user?: { id: string; role: string; email: string } } | null, hourLogId: string): Promise<boolean> {
  if (!session?.user) return false
  if (isSuperAdmin(session.user.role)) return true

  if (isAdmin(session.user.role)) {
    const scope = await getCityAccessScope(session.user.role, session.user.id)
    if (scope.kind === "none") return false
    if (scope.kind === "single") {
      const log = await prisma.hourLog.findUnique({ where: { id: hourLogId }, select: { project: { select: { cityId: true } } } })
      if (!log) return false
      const err = assertInScope(log.project.cityId, scope)
      return err === null
    }
    return true
  }

  const tutorId = await getTutorId(session.user.id, session.user.email)
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
    const referer = safeReferer(request.headers.get("referer"), "/dashboard/expenses")
    return NextResponse.redirect(new URL(referer, request.url), 303)
  }

  if (action === "edit") {
    const hours = parseFloat((formData.get("hours") as string) || "0")
    const date = formData.get("date") as string
    const mode = (formData.get("mode") as string) || "IN_PERSON"
    const description = formData.get("description") as string
    const superAdmin = isSuperAdmin(session!.user!.role)
    const billingRate = superAdmin ? parseFloat((formData.get("billingRate") as string) || "0") : undefined
    const tutorPayRate = superAdmin ? parseFloat((formData.get("tutorPayRate") as string) || "0") : undefined

    if (!date || !hours) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { hours, date: new Date(date), mode, description: description || null }
    if (superAdmin) {
      updateData.billingRate = billingRate
      updateData.tutorPayRate = tutorPayRate
    }

    await prisma.hourLog.update({ where: { id }, data: updateData })

    const log = await prisma.hourLog.findUnique({
      where: { id },
      include: { tutor: { include: { user: { select: { name: true } } } }, project: { select: { name: true, clientId: true, cityId: true } } },
    })
    if (log) {
      const effectivePayRate = superAdmin ? (tutorPayRate as number) : log.tutorPayRate
      const expenseAmount = hours * effectivePayRate
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

    await logActivity(session!.user!.id, "edited", "HourLog", id, `${hours}h${superAdmin ? `, $${tutorPayRate}/h` : ""}`)

    // Update linked invoice items on draft invoices
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: { hourLogId: id, invoice: { status: "DRAFT" } },
    })
    for (const item of invoiceItems) {
      await prisma.invoiceItem.update({
        where: { id: item.id },
        data: { hours, rate: billingRate ?? item.rate, amount: hours * (billingRate ?? item.rate) },
      })
    }

    const referer = safeReferer(request.headers.get("referer"), "/dashboard/hours")
    return NextResponse.redirect(new URL(referer, request.url), 303)
  }

  if (action === "delete") {
    // Check for linked invoices before deleting
    const linkedItems = await prisma.invoiceItem.findMany({
      where: { hourLogId: id },
      include: { invoice: { select: { status: true, number: true } } },
    })
    for (const item of linkedItems) {
      if (item.invoice.status !== "DRAFT") {
        return NextResponse.json({ error: `Cannot delete: this log is on invoice ${item.invoice.number} (${item.invoice.status})` }, { status: 400 })
      }
    }
    // Remove from draft invoices
    if (linkedItems.length > 0) {
      await prisma.invoiceItem.deleteMany({ where: { hourLogId: id } })
    }
    // Delete hour log + corresponding expense
    await prisma.expense.deleteMany({ where: { hourLogId: id } })
    await prisma.hourLog.delete({ where: { id } })
    await logActivity(session!.user!.id, "deleted", "HourLog", id)
    const referer = safeReferer(request.headers.get("referer"), "/dashboard/hours")
    return NextResponse.redirect(new URL(referer, request.url), 303)
  }

  // Default: redirect back (no matching action)
  const referer = safeReferer(request.headers.get("referer"), "/dashboard/hours")
  return NextResponse.redirect(new URL(referer, request.url), 303)
}
