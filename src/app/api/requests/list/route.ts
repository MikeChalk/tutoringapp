import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isTutor, isClient, getTutorId, getClientId, getCityAccessScope } from "@/lib/auth-helpers"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") || "NEW"
  const where: Record<string, unknown> = { status }

  // SECURITY: server-side city scope. Never trust client ?city= for CITY_ADMIN.
  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return NextResponse.json([])
  if (scope.kind === "single") {
    where.cityId = scope.cityId
  } else {
    const cityId = searchParams.get("city")
    if (cityId && cityId !== "all") where.cityId = cityId
  }

  // Tutors only see requests matched to them
  if (isTutor(session.user.role)) {
    const tutorId = await getTutorId(session.user.id, (session.user as { email?: string }).email || "")
    if (!tutorId) return NextResponse.json([])
    where.matchedTutorId = tutorId
  }

  // Clients only see their own requests
  if (isClient(session.user.role)) {
    const clientId = await getClientId(session.user.id, (session.user as { email?: string }).email || "")
    if (!clientId) return NextResponse.json([])
    where.clientId = clientId
  }

  const requests = await prisma.tutoringRequest.findMany({
    where,
    include: {
      matchedTutor: { include: { user: { select: { name: true } } } },
      city: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(requests)
}
