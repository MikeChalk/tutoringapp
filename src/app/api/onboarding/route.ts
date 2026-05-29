import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

import { isAdmin } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const tutorId = formData.get("tutorId") as string
  const contractType = formData.get("contractType") as string
  const yearLevel = formData.get("yearLevel") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const gradeLevels = formData.get("gradeLevels") as string
  const templateId = formData.get("templateId") as string

  if (!contractType || !yearLevel || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  let templateTerms = ""
  let templateGradeLevels = ""
  if (templateId) {
    const template = await prisma.contractTemplate.findUnique({ where: { id: templateId } })
    if (template) {
      templateTerms = template.terms
      templateGradeLevels = template.gradeLevels
    }
  }

  let finalTutorId = tutorId

  if (!tutorId && name && email) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }
    const tempPassword = Math.random().toString(36).slice(2, 10)
    const hashed = await bcrypt.hash(tempPassword, 12)
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: "TUTOR" },
    })
    const tutor = await prisma.tutor.create({
      data: { userId: user.id, tenure: yearLevel, gradeLevels: gradeLevels || templateGradeLevels, onboardingStep: 1 },
    })
    finalTutorId = tutor.id
    return NextResponse.redirect(
      new URL(`/dashboard/onboarding?created=${encodeURIComponent(email)}&pw=${encodeURIComponent(tempPassword)}`, request.url),
      303
    )
  }

  if (!finalTutorId) {
    return NextResponse.json({ error: "Missing tutorId" }, { status: 400 })
  }

  await prisma.tutor.update({
    where: { id: finalTutorId },
    data: { onboarded: true, onboardedAt: new Date(), tenure: yearLevel, ...(gradeLevels || templateGradeLevels ? { gradeLevels: gradeLevels || templateGradeLevels } : {}) },
  })

  await prisma.contract.updateMany({
    where: { tutorId: finalTutorId, status: "ACTIVE" },
    data: { status: "EXPIRED" },
  })

  await prisma.contract.create({
    data: {
      tutorId: finalTutorId,
      type: contractType,
      yearLevel,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      terms: templateTerms || `${contractType.replace(/_/g, " ")} contract — Year ${yearLevel === "1ST_YEAR" ? "1" : yearLevel === "2ND_YEAR" ? "2" : "3"}`,
    },
  })

  return NextResponse.redirect(new URL("/dashboard/onboarding", request.url), 303)
}
