import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendOnboardingEmail } from "@/lib/email"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tutor = await prisma.tutor.findUnique({ where: { userId: session.user.id } })
  if (!tutor) return NextResponse.json({ error: "Tutor not found" }, { status: 404 })

  const formData = await request.formData()
  const step = parseInt(formData.get("step") as string)

  if ((step === 5 || step === 6) && tutor.onboardingStep === step) {
    const next = Math.min(step + 1, 7)
    await prisma.tutor.update({
      where: { id: tutor.id },
      data: {
        onboardingStep: next,
        onboarded: next >= 7,
        onboardedAt: next >= 7 ? new Date() : tutor.onboardedAt,
        ...(step === 6 ? { videoWatched: true } : {}),
      },
    })

    if (next >= 7) {
      const user = await prisma.user.findUnique({ where: { id: tutor.userId } })
      if (user) {
        const msg = `<p>Congratulations! Your onboarding is complete. You're now ready to receive clients and start tutoring.</p>`
        await sendOnboardingEmail(user.email, user.name, msg, "onboarding_complete").catch(() => {})
      }
    }
  }

  return NextResponse.redirect(new URL("/dashboard/onboarding", request.url), 303)
}
