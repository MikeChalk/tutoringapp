import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getTutorId } from "@/lib/auth-helpers"
import { logActivity } from "@/lib/activity"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
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

  if (!projectId || !tutorId || !date || !hours) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const admin = isAdmin(session.user.role)

  if (!admin) {
    const userTutorId = await getTutorId(session.user.id, session.user.email)
    if (!userTutorId || userTutorId !== tutorId) {
      return NextResponse.json({ error: "You can only log hours for yourself" }, { status: 403 })
    }
  }

  const assignment = await prisma.projectTutor.findFirst({
    where: { projectId, tutorId },
  })
  if (!assignment) {
    return NextResponse.json({ error: "Tutor is not assigned to this project" }, { status: 403 })
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId } })

  if (!project || !tutor) {
    return NextResponse.json({ error: "Project or tutor not found" }, { status: 400 })
  }

  let billingRate: number
  let tutorPayRate: number

  if (manualBilling && manualPay) {
    billingRate = parseFloat(manualBilling)
    tutorPayRate = parseFloat(manualPay)
  } else {
    const stdGrades = ["ELEMENTARY", "SEC1_2", "SEC3", "SEC4_5", "CEGEP", "UNI"]
    const lookupGrade = (project.projectType === "STUDY_HALL" && stdGrades.includes(project.gradeLevel))
      ? "STUDY_HALL"
      : project.gradeLevel

    const br = await prisma.billingRate.findFirst({
      where: { gradeLevel: lookupGrade, mode, projectType: project.projectType },
    })
    const ps = await prisma.payScale.findFirst({
      where: { tenure: tutor.tenure, gradeLevel: lookupGrade, mode, projectType: project.projectType },
    })
    if (!br || !ps) {
      return NextResponse.json({ error: "Rate not found" }, { status: 400 })
    }
    billingRate = br.rate
    tutorPayRate = ps.rate
  }

  await prisma.hourLog.create({
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

  await logActivity(session.user.id, "logged_hours", "HourLog", null, `${hours}h on project ${projectId}`)

  return NextResponse.redirect(new URL("/dashboard/hours", request.url), 303)
}
