import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import { applyDiscountCode, calculateDiscount } from "@/lib/discounts"
import { logActivity } from "@/lib/activity"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const clientId = formData.get("clientId") as string
  const linesJson = formData.get("lines") as string
  const date = formData.get("date") as string
  const dueDateStr = formData.get("dueDate") as string
  const notes = formData.get("notes") as string
  const subtotal = parseFloat((formData.get("subtotal") as string) || "0")
  const taxRate = parseFloat((formData.get("taxRate") as string) || "0")
  const taxAmount = parseFloat((formData.get("taxAmount") as string) || "0")
  const totalAmount = parseFloat((formData.get("totalAmount") as string) || "0")
  const discountCode = formData.get("discountCode") as string
  const discountAmount = parseFloat((formData.get("discountAmount") as string) || "0")

  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 })
  }

  // Multi-line invoice
  if (linesJson) {
    try {
      const lines = JSON.parse(linesJson) as Array<{ description: string; hours: number; rate: number; amount: number }>
      const validLines = lines.filter(l => l.description && l.amount > 0)
      if (validLines.length === 0) return NextResponse.json({ error: "At least one line item required" }, { status: 400 })

      const dueDate = dueDateStr ? new Date(dueDateStr) : new Date(Date.now() + 3 * 86400000)
      const invoiceCount = await prisma.invoice.count()
      const number = `INV-${String(invoiceCount + 1).padStart(4, "0")}`

      // Validate and recalculate discount server-side
      let finalDiscountCode: string | null = null
      let finalDiscountAmount = 0
      if (discountCode) {
        const result = await applyDiscountCode(discountCode)
        if (result.valid) {
          finalDiscountCode = discountCode.toUpperCase()
          finalDiscountAmount = calculateDiscount(subtotal, result.discountPct, result.discountAmt)
        }
      }

      const finalTotal = Math.max(0, subtotal + taxAmount - finalDiscountAmount)

      await prisma.invoice.create({
        data: {
          number,
          clientId,
          dueDate,
          totalAmount: finalTotal,
          subtotal,
          taxRate,
          taxAmount,
          discountCode: finalDiscountCode,
          discountAmount: finalDiscountAmount,
          status: "DRAFT",
          notes: notes || null,
          items: {
            create: validLines.map(l => ({
              description: l.description,
              hours: l.hours,
              rate: l.rate,
              amount: l.amount,
            })),
          },
        },
      })

      await logActivity(session.user.id, "created", "Invoice", number, `Client: ${clientId}, $${finalTotal.toFixed(2)}`)

      return NextResponse.redirect(new URL("/dashboard/invoices", request.url), 303)
    } catch {
      return NextResponse.json({ error: "Invalid line items" }, { status: 400 })
    }
  }

  // Legacy: auto invoice from hour logs
  const projectId = formData.get("projectId") as string
  const logs = await prisma.hourLog.findMany({
    where: {
      invoiceItems: { none: {} },
      ...(projectId ? { projectId } : {}),
      project: { clientId },
    },
    include: { project: true },
  })

  if (logs.length === 0) {
    return NextResponse.json({ error: "No unbilled hours to invoice." }, { status: 400 })
  }

  const items = logs.map((log) => ({
    description: `Tutoring on ${new Date(log.date).toLocaleDateString()} (${log.mode === "ONLINE" ? "Online" : "In Person"})`,
    hours: log.hours,
    rate: log.billingRate,
    amount: log.hours * log.billingRate,
    hourLogId: log.id,
  }))

  const total = items.reduce((sum, item) => sum + item.amount, 0)
  const dueDate = new Date(Date.now() + 3 * 86400000)
  const invoiceCount = await prisma.invoice.count()
  const number = `INV-${String(invoiceCount + 1).padStart(4, "0")}`

  const invoice = await prisma.invoice.create({
    data: {
      number,
      clientId,
      projectId: projectId || null,
      dueDate,
      totalAmount: total,
      status: "DRAFT",
      items: { create: items },
    },
  })

  return NextResponse.redirect(new URL(`/dashboard/invoices/${invoice.id}`, request.url), 303)
}
