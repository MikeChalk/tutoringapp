import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const clientId = formData.get("clientId") as string
  const projectId = formData.get("projectId") as string
  const description = formData.get("description") as string
  const manualAmount = parseFloat((formData.get("amount") as string) || "0")
  const date = formData.get("date") as string
  const dueDateStr = formData.get("dueDate") as string

  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 })
  }

  const dueDate = dueDateStr ? new Date(dueDateStr) : new Date(Date.now() + 3 * 86400000)
  const invoiceCount = await prisma.invoice.count()
  const number = `INV-${String(invoiceCount + 1).padStart(4, "0")}`

  if (description) {
    if (manualAmount <= 0) return NextResponse.json({ error: "Amount must be positive" }, { status: 400 })
    await prisma.invoice.create({
      data: {
        number,
        clientId,
        projectId: projectId || null,
        dueDate,
        totalAmount: manualAmount,
        status: "DRAFT",
        notes: description,
        items: { create: [{ description, hours: 0, rate: 0, amount: manualAmount }] },
      },
    })
    return NextResponse.redirect(new URL("/dashboard/invoices", request.url), 303)
  }

  const logs = await prisma.hourLog.findMany({
    where: {
      invoiceItems: { none: {} },
      ...(projectId ? { projectId } : {}),
      project: { clientId },
    },
    include: { project: true },
  })

  if (logs.length === 0) {
    return NextResponse.json({ error: "No unbilled hours to invoice. Use manual invoice with a description instead." }, { status: 400 })
  }

  const items = logs.map((log) => ({
    description: `Tutoring on ${new Date(log.date).toLocaleDateString()} (${log.mode === "ONLINE" ? "Online" : "In Person"})`,
    hours: log.hours,
    rate: log.billingRate,
    amount: log.hours * log.billingRate,
    hourLogId: log.id,
  }))

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)

  const invoice = await prisma.invoice.create({
    data: {
      number,
      clientId,
      projectId: projectId || null,
      dueDate,
      totalAmount,
      status: "DRAFT",
      items: { create: items },
    },
  })

  return NextResponse.redirect(new URL(`/dashboard/invoices/${invoice.id}`, request.url), 303)
}
