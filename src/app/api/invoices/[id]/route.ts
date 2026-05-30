import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import { sendClientInviteEmail } from "@/lib/email"
import { logActivity } from "@/lib/activity"

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await props.params
  const formData = await request.formData()
  const action = formData.get("_action") as string
  const redirectTo = (formData.get("redirectTo") as string) || `/dashboard/invoices/${id}`

  if (action === "markSent") {
    await prisma.invoice.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } })
    await logActivity(session.user.id, "sent", "Invoice", id)
  } else if (action === "markPaid") {
    const gateway = (formData.get("paymentGateway") as string) || "other"
    await prisma.invoice.update({ where: { id }, data: { status: "PAID", paidAt: new Date(), paymentGateway: gateway } })
    // Cascade paidAt to underlying hour logs
    const items = await prisma.invoiceItem.findMany({ where: { invoiceId: id }, select: { hourLogId: true } })
    const logIds = items.map(i => i.hourLogId).filter(Boolean) as string[]
    if (logIds.length > 0) {
      await prisma.hourLog.updateMany({ where: { id: { in: logIds } }, data: { paidAt: new Date() } })
    }
    // Notify client
    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { client: { include: { user: { select: { name: true, email: true } } } } } })
    if (invoice?.client?.user.email) {
      sendClientInviteEmail(invoice.client.user.email, invoice.client.user.name,
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/invoices/${id}`, "payment_received")
    }
  } else if (action === "markOverdue") {
    await prisma.invoice.update({ where: { id }, data: { status: "OVERDUE" } })
  } else if (action === "sendReminder") {
    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { client: { include: { user: { select: { name: true, email: true } } } } } })
    if (invoice?.client?.user.email) {
      sendClientInviteEmail(invoice.client.user.email, invoice.client.user.name,
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/invoices/${id}`, "invoice_reminder")
    }
  }

  return NextResponse.redirect(new URL(redirectTo, request.url), 303)
}
