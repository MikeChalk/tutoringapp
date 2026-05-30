import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isCityAdmin, isSuperAdmin } from "@/lib/auth-helpers"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isSuperAdmin(session.user.role) && !isCityAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const cityId = searchParams.get("city")

  const where: Record<string, unknown> = { onboarded: false, isActive: true }
  if (cityId && cityId !== "all") {
    where.user = { cityId }
  }

  const tutors = await prisma.tutor.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(tutors)
}
