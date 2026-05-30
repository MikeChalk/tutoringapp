import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isTutor, getTutorId } from "@/lib/auth-helpers"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") || "NEW"
  const cityId = searchParams.get("city")

  const where: Record<string, unknown> = { status }
  if (cityId && cityId !== "all") {
    where.OR = [
      { matchedTutor: { user: { cityId } } },
      { client: { user: { cityId } } },
    ]
  }

  // Tutors only see requests matched to them
  if (isTutor(session.user.role)) {
    const tutorId = await getTutorId(session.user.id, (session.user as { email?: string }).email || "")
    if (!tutorId) return NextResponse.json([])
    where.matchedTutorId = tutorId
  }

  const requests = await prisma.tutoringRequest.findMany({
    where,
    include: {
      matchedTutor: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(requests)
}
