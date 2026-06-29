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

  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId }, select: { isActive: true, user: { select: { cityId: true } } } })
  if (!tutor) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const scopeError = assertInScope(tutor.user.cityId, scope)
  if (scopeError) return scopeError

  await prisma.tutor.update({
    where: { id: tutorId },
    data: { isActive: !tutor.isActive },
  })

  return NextResponse.redirect(new URL(`/dashboard/tutors/${tutorId}`, request.url), 303)
}
