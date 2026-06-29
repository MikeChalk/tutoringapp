import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityAccessScope, assertInScope } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return NextResponse.json({ error: "No city access" }, { status: 403 })

  const formData = await request.formData()
  const tutorId = formData.get("tutorId") as string
  if (!tutorId) return NextResponse.json({ error: "Missing tutorId" }, { status: 400 })

  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId }, select: { user: { select: { cityId: true } } } })
  if (!tutor) return NextResponse.json({ error: "Tutor not found" }, { status: 404 })

  const scopeError = assertInScope(tutor.user.cityId, scope)
  if (scopeError) return scopeError

  const fullTutor = await prisma.tutor.findUnique({ where: { id: tutorId } })
  if (!fullTutor) return NextResponse.json({ error: "Tutor not found" }, { status: 404 })

  const tenure = (formData.get("tenure") as string)?.trim() || fullTutor.tenure
  const gradeLevels = (formData.get("gradeLevels") as string)?.trim() || undefined
  const subjects = (formData.get("subjects") as string)?.trim() || undefined
  const phone = (formData.get("phone") as string)?.trim() || undefined
  const bio = (formData.get("bio") as string)?.trim() || undefined

  await prisma.tutor.update({
    where: { id: tutorId },
    data: { tenure, gradeLevels, subjects, phone, bio },
  })

  return NextResponse.redirect(new URL(`/dashboard/tutors/${tutorId}`, request.url), 303)
}