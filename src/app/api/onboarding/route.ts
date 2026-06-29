import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityAccessScope, assertInScope } from "@/lib/auth-helpers"
import { sendOnboardingEmail, sendParentNotificationEmail, sendEmail, hasEmailTransport } from "@/lib/email"
import { CONTRACT_TYPES, TENURE_VALUES } from "@/lib/constants"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return NextResponse.json({ error: "No city access" }, { status: 403 })

  const formData = await request.formData()
  const action = formData.get("_action") as string
  const tutorId = formData.get("tutorId") as string

  if (action === "advance" && tutorId) {
    const tutor = await prisma.tutor.findUnique({
      where: { id: tutorId },
      include: { user: { select: { name: true, email: true, cityId: true } } },
    })
    if (!tutor) return NextResponse.json({ error: "Tutor not found" }, { status: 404 })

    const scopeError = assertInScope(tutor.user.cityId, scope)
    if (scopeError) return scopeError

    const currentStep = tutor.onboardingStep

    // Only allow admin to advance steps 0, 2, 3, 4 (1, 5, and 6 are tutor-only)
    if (![0, 2, 3, 4].includes(currentStep)) {
      return NextResponse.json({ error: `Step ${currentStep} cannot be advanced by admin` }, { status: 400 })
    }

    // Step 0 → 1: Send email to tutor
    if (currentStep === 0) {
      const emailMessage = (formData.get("emailMessage") as string) || `<p>Welcome to J.A.S.S.! We're excited to have you on the team.</p><p>Please log in to the platform and sign your contract to get started.</p>`
      await sendOnboardingEmail(tutor.user.email, tutor.user.name, emailMessage)
    }

    // Step 2 → 3: Send email to parent
    if (currentStep === 2) {
      const parentEmail = (formData.get("parentEmail") as string) || ""
      const parentName = (formData.get("parentName") as string) || "Parent"
      const parentMessage = (formData.get("parentMessage") as string) || ""
      if (parentEmail) {
        await sendParentNotificationEmail(parentEmail, parentName, tutor.user.name, parentMessage)
      }
    }

    // Step 3 → 4: Create project and auto-assign tutor
    if (currentStep === 3) {
      const projectName = (formData.get("projectName") as string)?.trim()
      if (!projectName) {
        return NextResponse.json({ error: "Project name is required to advance from step 3" }, { status: 400 })
      }
      const clientId = formData.get("projectClientId") as string
      const gradeLevel = (formData.get("projectGradeLevel") as string) || "ELEMENTARY"
      const subjects = formData.get("projectSubjects") as string
      if (projectName) {
        const project = await prisma.project.create({
          data: {
            name: projectName,
            clientId: clientId || null,
            gradeLevel,
            subjects: subjects || "",
            projectType: "STUDENT",
            cityId: scope.kind === "single" ? scope.cityId : null,
          },
        })
        await prisma.projectTutor.create({ data: { projectId: project.id, tutorId } })
      }
    }

    const nextStep = Math.min(currentStep + 1, 7)

    // Step 3→4: Notify tutor they've been assigned to a project
    if (currentStep === 3 && nextStep === 4) {
      const msg = `<p>You've been assigned to a new tutoring project. Log in to view details and get started.</p>`
      await sendOnboardingEmail(tutor.user.email, tutor.user.name, msg, "tutor_assigned")
    }

    // Step 6→7: Notify tutor onboarding is complete
    if (nextStep >= 7) {
      const msg = `<p>Congratulations! Your onboarding is complete. You're now ready to receive clients and start tutoring.</p>`
      await sendOnboardingEmail(tutor.user.email, tutor.user.name, msg, "onboarding_complete")
    }
    await prisma.tutor.update({
      where: { id: tutorId },
      data: {
        onboardingStep: nextStep,
        onboarded: nextStep >= 7,
        onboardedAt: nextStep >= 7 ? new Date() : tutor.onboardedAt,
      },
    })

    return NextResponse.redirect(new URL("/dashboard/onboarding", request.url), 303)
  }

  if (action === "contract" && tutorId) {
    const tutorCheck = await prisma.tutor.findUnique({ where: { id: tutorId }, select: { user: { select: { cityId: true } } } })
    if (!tutorCheck) return NextResponse.json({ error: "Tutor not found" }, { status: 404 })
    const scopeError = assertInScope(tutorCheck.user.cityId, scope)
    if (scopeError) return scopeError

    const contractType = formData.get("contractType") as string
    const yearLevel = formData.get("yearLevel") as string
    const startDate = formData.get("startDate") as string
    const endDate = formData.get("endDate") as string
    const gradeLevels = formData.get("gradeLevels") as string
    const templateId = formData.get("templateId") as string

    if (!contractType || !yearLevel || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    if (!CONTRACT_TYPES.includes(contractType as typeof CONTRACT_TYPES[number])) {
      return NextResponse.json({ error: "Invalid contract type" }, { status: 400 })
    }
    if (!TENURE_VALUES.includes(yearLevel as typeof TENURE_VALUES[number])) {
      return NextResponse.json({ error: "Invalid year level" }, { status: 400 })
    }

    let templateTerms = ""
    let templateGradeLevels = ""
    if (templateId) {
      const template = await prisma.contractTemplate.findUnique({ where: { id: templateId } })
      if (template) { templateTerms = template.terms; templateGradeLevels = template.gradeLevels }
    }

    await prisma.$transaction(async (tx) => {
      await tx.tutor.update({
        where: { id: tutorId },
        data: { tenure: yearLevel, ...(gradeLevels || templateGradeLevels ? { gradeLevels: gradeLevels || templateGradeLevels } : {}) },
      })

      await tx.contract.updateMany({
        where: { tutorId, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      })

      await tx.contract.create({
        data: {
          tutorId, type: contractType, yearLevel,
          startDate: new Date(startDate), endDate: new Date(endDate),
          terms: templateTerms || `${contractType.replace(/_/g, " ")} contract — Year ${yearLevel === "1ST_YEAR" ? "1" : yearLevel === "2ND_YEAR" ? "2" : "3"}`,
        },
      })
    })

    return NextResponse.redirect(new URL("/dashboard/onboarding", request.url), 303)
  }

  const contractType = formData.get("contractType") as string
  const yearLevel = formData.get("yearLevel") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string
  const name = formData.get("name") as string
  const email = formData.get("email") as string
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
    const tempPassword = crypto.randomBytes(8).toString("hex")
    const hashed = await bcrypt.hash(tempPassword, 12)
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: "TUTOR", cityId: scope.kind === "single" ? scope.cityId : null },
    })
    const tutor = await prisma.tutor.create({
      data: { userId: user.id, tenure: yearLevel, gradeLevels: gradeLevels || templateGradeLevels, onboardingStep: 0 },
    })
    finalTutorId = tutor.id
    // Send password via email (respects global email toggle)
    try {
      const settings = await prisma.companySettings.findUnique({ where: { id: "main" }, select: { emailEnabled: true } })
      if (settings?.emailEnabled !== false && (await hasEmailTransport())) {
        await sendEmail({
          from: "J.A.S.S. <info@jasstutors.com>",
          to: email,
          subject: "Your Tutor Account",
          text: `Welcome ${name}! Your account has been created. Please log in with your email and this temporary password: ${tempPassword}\n\nChange your password after logging in.`,
        })
      }
    } catch (e) {
      console.error("[onboarding] temp password email failed for", email, e instanceof Error ? e.message : e)
    }

    return NextResponse.redirect(
      new URL(`/dashboard/onboarding?created=${encodeURIComponent(email)}`, request.url),
      303
    )
  }

  if (!finalTutorId) {
    return NextResponse.json({ error: "Missing tutorId" }, { status: 400 })
  }

  if (!CONTRACT_TYPES.includes(contractType as typeof CONTRACT_TYPES[number])) {
    return NextResponse.json({ error: "Invalid contract type" }, { status: 400 })
  }
  if (!TENURE_VALUES.includes(yearLevel as typeof TENURE_VALUES[number])) {
    return NextResponse.json({ error: "Invalid year level" }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.tutor.update({
      where: { id: finalTutorId },
      data: {
        onboardingStep: 1,
        tenure: yearLevel,
        ...(gradeLevels || templateGradeLevels ? { gradeLevels: gradeLevels || templateGradeLevels } : {}),
      },
    })

    await tx.contract.updateMany({
      where: { tutorId: finalTutorId, status: "ACTIVE" },
      data: { status: "EXPIRED" },
    })

    await tx.contract.create({
      data: {
        tutorId: finalTutorId,
        type: contractType,
        yearLevel,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        terms: templateTerms || `${contractType.replace(/_/g, " ")} contract — Year ${yearLevel === "1ST_YEAR" ? "1" : yearLevel === "2ND_YEAR" ? "2" : "3"}`,
      },
    })
  })

  return NextResponse.redirect(new URL("/dashboard/onboarding", request.url), 303)
}
