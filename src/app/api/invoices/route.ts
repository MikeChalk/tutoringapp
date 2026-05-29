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

  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 })
  }

  const today = new Date()
  const dueDate = new Date(today)
  dueDate.setDate(dueDate.getDate() + 30)

  const invoiceCount = await prisma.invoice.count()
  const number = `INV-${String(invoiceCount + 1).padStart(4, "0")}`

  const logs = await prisma.hourLog.findMany({
    where: {
      invoiceItems: { none: {} },
      ...(projectId ? { projectId } : {}),
      project: { clientId, projectType: { not: "STUDY_HALL" } },
    },
    include: { project: true },
  })

  if (logs.length === 0) {
    return NextResponse.json(
      { error: "No unbilled hours to invoice" },
      { status: 400 }
    )
  }

  const items = logs.map((log) => ({
    description: log.description || `Tutoring on ${new Date(log.date).toLocaleDateString()} (${log.mode === "ONLINE" ? "Online" : "In Person"})`,
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

  return NextResponse.redirect(
    new URL(`/dashboard/invoices/${invoice.id}`, request.url),
    303
  )
}
