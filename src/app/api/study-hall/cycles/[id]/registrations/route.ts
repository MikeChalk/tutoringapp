import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityAccessScope, assertInScope } from "@/lib/auth-helpers"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return NextResponse.json({ error: "No city access" }, { status: 403 })

  const { id } = await params

  const cycle = await prisma.studyHallCycle.findUnique({ where: { id }, select: { cityId: true, billingModel: true } })
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })

  const scopeError = assertInScope(cycle.cityId, scope)
  if (scopeError) return scopeError

  const formData = await request.formData()
  const studentName = (formData.get("studentName") as string)?.trim()
  const grade = (formData.get("grade") as string)?.trim() || null
  const parentName = (formData.get("parentName") as string)?.trim() || ""
  const parentEmail = (formData.get("parentEmail") as string)?.trim() || ""
  const parentPhone = (formData.get("parentPhone") as string)?.trim() || ""

  if (!studentName) return NextResponse.json({ error: "Student name required" }, { status: 400 })

  await prisma.registration.create({
    data: {
      cycleId: id,
      studentName,
      grade,
      parentName,
      parentEmail,
      parentPhone,
      status: "CONFIRMED",
      confirmedAt: new Date(),
    },
  })

  return NextResponse.redirect(new URL(`/dashboard/study-hall/${id}`, request.url), 303)
}
