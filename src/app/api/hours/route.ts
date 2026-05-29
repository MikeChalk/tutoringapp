import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

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

  if (!projectId || !tutorId || !date || !hours) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } })
  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId } })

  if (!project || !tutor) {
    return NextResponse.json({ error: "Project or tutor not found" }, { status: 400 })
  }

  const gradeLevel = project.gradeLevel
  const tenure = tutor.tenure

  const billingRate = await prisma.billingRate.findFirst({
    where: { gradeLevel, mode },
  })

  const payScale = await prisma.payScale.findFirst({
    where: { tenure, gradeLevel, mode },
  })

  if (!billingRate) {
    return NextResponse.json({ error: `No billing rate found for ${gradeLevel} ${mode}` }, { status: 400 })
  }

  if (!payScale) {
    return NextResponse.json({ error: `No pay scale found for ${tenure} ${gradeLevel} ${mode}` }, { status: 400 })
  }

  await prisma.hourLog.create({
    data: {
      tutorId,
      projectId,
      date: new Date(date),
      hours,
      mode,
      billingRate: billingRate.rate,
      tutorPayRate: payScale.rate,
      description: description || null,
    },
  })

  return NextResponse.redirect(new URL("/dashboard/hours", request.url), 303)
}
