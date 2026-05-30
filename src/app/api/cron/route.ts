import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import { sendClientInviteEmail } from "@/lib/email"

// Called by cron or manual button
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  if (action === "generate") {
    // Find all unbilled hour logs grouped by client in a single query
    const logs = await prisma.hourLog.findMany({
      where: { invoiceItems: { none: {} }, paidAt: null },
      include: { project: { select: { clientId: true } } },
      orderBy: { date: "asc" },
    })

    // Group by client
    const clientLogs = new Map<string, typeof logs>()
    for (const log of logs) {
      if (!log.project.clientId) continue
      const existing = clientLogs.get(log.project.clientId) || []
      existing.push(log)
      clientLogs.set(log.project.clientId, existing)
    }

    let created = 0
    for (const [clientId, clientHourLogs] of clientLogs) {
      if (clientHourLogs.length === 0) continue

      const items = clientHourLogs.map(log => ({
        description: log.description || `Tutoring on ${new Date(log.date).toLocaleDateString()}`,
        hours: log.hours, rate: log.billingRate, amount: log.hours * log.billingRate, hourLogId: log.id,
      }))
      const total = items.reduce((s, i) => s + i.amount, 0)
      const count = await prisma.invoice.count()
      const dueDate = new Date(Date.now() + 3 * 86400000)

      await prisma.invoice.create({
        data: {
          number: `INV-${String(count + 1).padStart(4, "0")}`,
          clientId, dueDate, totalAmount: total, status: "DRAFT",
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
