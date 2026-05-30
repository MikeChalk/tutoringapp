import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getTutorId } from "@/lib/auth-helpers"
import { logActivity } from "@/lib/activity"
import { STUDENT_GRADES } from "@/lib/constants"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const projectId = formData.get("projectId") as string
  const tutorId = formData.get("tutorId") as string
  const date = formData.get("date") as string
  const hours = parseFloat(formData.get("hours") as string)
  const mode = (formData.get("mode") as string) || "IN_PERSON"
  const description = formData.get("description") as string
  const manualBilling = formData.get("billingRate") as string
  const manualPay = formData.get("tutorPayRate") as string
  const category = formData.get("category") as string

  if (!projectId || !tutorId || !date || isNaN(hours) || hours <= 0) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const admin = isAdmin(session.user.role)

  if (!admin) {
    const userTutorId = await getTutorId(session.user.id, session.user.email)
    if (!userTutorId || userTutorId !== tutorId) {
      return NextResponse.json({ error: "You can only log hours for yourself" }, { status: 403 })
    }
    const assignment = await prisma.projectTutor.findFirst({
      where: { projectId, tutorId },
    })
    if (!assignment) {
      return NextResponse.json({ error: "Tutor is not assigned to this project" }, { status: 403 })
    }
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId }, include: { user: { select: { name: true } } } })

  if (!project || !tutor) {
    return NextResponse.json({ error: "Project or tutor not found" }, { status: 400 })
  }

  let billingRate = 0
  let tutorPayRate = 0

  if (manualBilling && manualPay) {
    billingRate = parseFloat(manualBilling)
    tutorPayRate = parseFloat(manualPay)
    if (isNaN(billingRate) || isNaN(tutorPayRate)) {
      return NextResponse.json({ error: "Invalid rate values" }, { status: 400 })
    }
  } else {
    // Get rates from the tutor's active contract first, fall back to PayScale
    const contract = await prisma.contract.findFirst({
      where: { tutorId, status: "ACTIVE" },
      select: { rates: true, yearLevel: true },
    })

    const stdGrades = STUDENT_GRADES
    let lookupGrade: string
    if (project.projectType === "STUDY_HALL" && category) {
      lookupGrade = category
    } else if (project.projectType === "STUDY_HALL" && stdGrades.includes(project.gradeLevel)) {
      lookupGrade = "STUDY_HALL_TUTOR"
    } else {
      lookupGrade = project.gradeLevel
    }

    // Try contract rates first for tutor pay (mode-aware key first, then plain key)
    if (contract?.rates) {
      const contractRates = JSON.parse(contract.rates) as Record<string, number>
      const modeKey = `${lookupGrade}|${mode}`
      if (contractRates[modeKey] !== undefined) {
        tutorPayRate = contractRates[modeKey]
      } else if (contractRates[lookupGrade] !== undefined) {
        tutorPayRate = contractRates[lookupGrade]
      }
    }

    // Always look up billing rate from rate table
    const br = await prisma.billingRate.findFirst({
      where: { gradeLevel: lookupGrade, mode, projectType: project.projectType },
    })
    if (project.projectType !== "STUDY_HALL" && !br) {
      return NextResponse.json({ error: `No billing rate found for ${lookupGrade} / ${mode}` }, { status: 400 })
    }
    billingRate = br?.rate ?? 0

    // Fall back to PayScale if contract didn't provide tutor pay rate
    if (tutorPayRate === 0) {
      const ps = await prisma.payScale.findFirst({
        where: { tenure: tutor.tenure, gradeLevel: lookupGrade, mode, projectType: project.projectType },
      })
      if (!ps) {
        return NextResponse.json({ error: "Rate not found for this category and tenure" }, { status: 400 })
      }
      tutorPayRate = ps.rate
    }
  }

  const hourLog = await prisma.$transaction(async (tx) => {
    const log = await tx.hourLog.create({
      data: {
        tutorId,
        projectId,
        date: new Date(date),
        hours,
        mode,
        billingRate,
        tutorPayRate,
        description: description || null,
        category: category || null,
      },
    })

    await tx.expense.create({
      data: {
        description: `Tutor: ${tutor.user.name} — ${project.name} (${hours}h)`,
        amount: hours * tutorPayRate,
        category: "TUTOR_PAY",
        date: new Date(date),
        clientId: project.clientId,
        cityId: project.cityId,
        hourLogId: log.id,
      },
    })

    return log
  })

  await logActivity(session.user.id, "logged_hours", "HourLog", hourLog.id, `${hours}h on project ${projectId}`)

  return NextResponse.redirect(new URL("/dashboard/hours", request.url), 303)
}
