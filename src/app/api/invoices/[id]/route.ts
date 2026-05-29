import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await props.params
  const formData = await request.formData()
  const action = formData.get("_action") as string

  if (action === "markSent") {
    await prisma.invoice.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } })
  } else if (action === "markPaid") {
    await prisma.invoice.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } })
  } else if (action === "markOverdue") {
    await prisma.invoice.update({ where: { id }, data: { status: "OVERDUE" } })
  }

  return NextResponse.redirect(new URL(`/dashboard/invoices/${id}`, request.url), 303)
}
