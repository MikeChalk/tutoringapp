import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const clientId = formData.get("clientId") as string
  const projectId = formData.get("projectId") as string

  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 })
  }

  const today = new Date()
  const dueDate = new Date(today.setDate(today.getDate() + 30))

  const invoiceCount = await prisma.invoice.count()
  const number = `INV-${String(invoiceCount + 1).padStart(4, "0")}`

  const approvedLogs = await prisma.hourLog.findMany({
    where: {
      status: "APPROVED",
      ...(projectId ? { projectId } : {}),
      project: { clientId },
    },
    include: { project: true },
  })

  if (approvedLogs.length === 0) {
    return NextResponse.json(
      { error: "No approved hours to invoice" },
      { status: 400 }
    )
  }

  const hourlyRate = approvedLogs[0].project.hourlyRate
  const items = approvedLogs.map((log) => ({
    description: log.description || `Tutoring on ${new Date(log.date).toLocaleDateString()}`,
    hours: log.hours,
    rate: hourlyRate,
    amount: log.hours * hourlyRate,
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
      items: {
        create: items,
      },
    },
  })

  return NextResponse.redirect(
    new URL(`/dashboard/invoices/${invoice.id}`, request.url),
    303
  )
}
