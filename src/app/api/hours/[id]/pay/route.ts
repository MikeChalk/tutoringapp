import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const hourLog = await prisma.hourLog.findUnique({ where: { id } })
  if (!hourLog) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.hourLog.update({
    where: { id },
    data: { paidAt: hourLog.paidAt ? null : new Date() },
  })

  return NextResponse.redirect(new URL(request.headers.get("referer") || "/dashboard/payments", request.url), 303)
}
