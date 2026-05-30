import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendClientInviteEmail } from "@/lib/email"

// Called by cron or manual button
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  if (action === "generate") {
    const clients = await prisma.client.findMany({ include: { user: { select: { name: true, email: true } }, projects: { select: { id: true } } } })
    let created = 0

    for (const client of clients) {
      const logs = await prisma.hourLog.findMany({
        where: { invoiceItems: { none: {} }, project: { clientId: client.id } },
        include: { project: true },
      })
      if (logs.length === 0) continue

      const items = logs.map(log => ({
        description: log.description || `Tutoring on ${new Date(log.date).toLocaleDateString()}`,
        hours: log.hours, rate: log.billingRate, amount: log.hours * log.billingRate, hourLogId: log.id,
      }))
      const total = items.reduce((s, i) => s + i.amount, 0)
      const count = await prisma.invoice.count()
      const dueDate = new Date(Date.now() + 3 * 86400000)

      await prisma.invoice.create({
        data: {
          number: `INV-${String(count + 1).padStart(4, "0")}`,
          clientId: client.id, dueDate, totalAmount: total, status: "DRAFT",
          items: { create: items },
        },
      })
      created++
    }

    return NextResponse.redirect(new URL(`/dashboard/invoices?generated=${created}`, request.url), 303)
  }

  if (action === "remind") {
    const overdueDate = new Date(Date.now() - 7 * 86400000)
    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ["SENT", "OVERDUE"] }, dueDate: { lt: overdueDate } },
      include: { client: { include: { user: { select: { name: true, email: true } } } } },
    })

    for (const inv of invoices) {
      if (inv.client?.user.email) {
        sendClientInviteEmail(inv.client.user.email, inv.client.user.name,
          `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/invoices/${inv.id}`, "invoice_reminder")
      }
      await prisma.invoice.update({ where: { id: inv.id }, data: { status: "OVERDUE" } })
    }

    return NextResponse.redirect(new URL(`/dashboard/invoices?reminded=${invoices.length}`, request.url), 303)
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
