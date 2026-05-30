import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

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
      // Unpay
      await prisma.hourLog.update({ where: { id }, data: { paidAt: null } })
    } else {
      await prisma.hourLog.update({ where: { id }, data: { paidAt: new Date() } })
    }
    const referer = request.headers.get("referer") || "/dashboard/expenses"
    return NextResponse.redirect(new URL(referer, request.url), 303)
  }

  // Delete
  await prisma.hourLog.delete({ where: { id } })

  const referer = request.headers.get("referer") || "/dashboard/hours"
  return NextResponse.redirect(new URL(referer, request.url), 303)
}
