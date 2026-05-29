import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tutors = await prisma.tutor.findMany({
    where: { onboarded: false, isActive: true },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(tutors)
}
