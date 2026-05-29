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
  const manualBilling = formData.get("billingRate") as string
  const manualPay = formData.get("tutorPayRate") as string

  if (!projectId || !tutorId || !date || !hours) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
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
    const br = await prisma.billingRate.findFirst({
      where: { gradeLevel: project.gradeLevel, mode },
    })
    const ps = await prisma.payScale.findFirst({
      where: { tenure: tutor.tenure, gradeLevel: project.gradeLevel, mode },
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
    },
  })

  return NextResponse.redirect(new URL("/dashboard/hours", request.url), 303)
}
