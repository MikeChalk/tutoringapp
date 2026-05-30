import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendOnboardingEmail } from "@/lib/email"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tutor = await prisma.tutor.findUnique({
    where: { userId: session.user.id },
  })

  if (!tutor) {
    return NextResponse.json({ error: "Tutor not found" }, { status: 404 })
  }

  const contract = await prisma.contract.findFirst({
    where: { tutorId: tutor.id, status: "ACTIVE" },
  })

  if (!contract) {
    return NextResponse.json({ error: "No active contract" }, { status: 404 })
  }

  if (contract.signed) {
    return NextResponse.json({ error: "Already signed" }, { status: 400 })
  }

  await prisma.contract.update({
    where: { id: contract.id },
    data: { signed: true, signedAt: new Date() },
  })

  if (tutor.onboardingStep === 1) {
    await prisma.tutor.update({
      where: { id: tutor.id },
      data: { onboardingStep: 2 },
    })
    const tutorUser = await prisma.user.findUnique({ where: { id: tutor.userId }, select: { name: true, email: true } })
    if (tutorUser) {
      await sendOnboardingEmail(tutorUser.email, tutorUser.name, "<p>Your contract has been signed. We'll be in touch with the next steps.</p>", "contract_signed")
    }
  }

  return NextResponse.redirect(new URL("/dashboard/contract", request.url), 303)
}
