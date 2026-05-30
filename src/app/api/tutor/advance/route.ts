import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const step = parseInt(formData.get("step") as string)
  const admin = isAdmin(session.user.role)

  let tutor
  if (admin) {
    const tutorId = formData.get("tutorId") as string
    if (tutorId) {
      tutor = await prisma.tutor.findUnique({ where: { id: tutorId } })
    }
  }
  if (!tutor) {
    tutor = await prisma.tutor.findUnique({ where: { userId: session.user.id } })
  }
  if (!tutor) return NextResponse.json({ error: "Tutor not found" }, { status: 404 })

  const formData = await request.formData()
  const step = parseInt(formData.get("step") as string)

  if (step === 5 || step === 6) {
    if (tutor.onboardingStep === step) {
      const next = Math.min(step + 1, 6)
      await prisma.tutor.update({
        where: { id: tutor.id },
        data: {
          onboardingStep: next,
          onboarded: next >= 6,
          onboardedAt: next >= 6 ? new Date() : tutor.onboardedAt,
        },
      })
    }
  }

  return NextResponse.redirect(new URL("/dashboard/onboarding", request.url), 303)
}
