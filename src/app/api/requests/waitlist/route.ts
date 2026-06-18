import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isCityAdmin, isSuperAdmin, getCityAccessScope } from "@/lib/auth-helpers"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isSuperAdmin(session.user.role) && !isCityAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  // SECURITY: scope to admin's city. CITY_ADMIN → own city only; null-city → none.
  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return NextResponse.json([])

  const where: Record<string, unknown> = { onboarded: false, isActive: true }
  if (scope.kind === "single") {
    where.user = { cityId: scope.cityId }
  } else {
    const { searchParams } = new URL(request.url)
    const cityId = searchParams.get("city")
    if (cityId && cityId !== "all") where.user = { cityId }
  }

  const tutors = await prisma.tutor.findMany({
    where,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(tutors)
}
