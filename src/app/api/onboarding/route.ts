import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const tutorId = formData.get("tutorId") as string

  if (!tutorId) {
    return NextResponse.json({ error: "Missing tutorId" }, { status: 400 })
  }

  await prisma.tutor.update({
    where: { id: tutorId },
    data: {
      onboarded: true,
      onboardedAt: new Date(),
    },
  })

  return NextResponse.redirect(new URL("/dashboard/onboarding", request.url), 303)
}
