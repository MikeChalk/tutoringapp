import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityAccessScope, assertInScope } from "@/lib/auth-helpers"
import { logActivity } from "@/lib/activity"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return NextResponse.json({ error: "No city access" }, { status: 403 })

  const formData = await request.formData()
  const projectId = formData.get("projectId") as string
  const tutorId = formData.get("tutorId") as string

  if (!projectId || !tutorId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const existing = await prisma.projectTutor.findFirst({ where: { projectId, tutorId } })
  if (existing) {
    return NextResponse.redirect(new URL(`/dashboard/projects/${projectId}`, request.url), 303)
  }

  const [project, tutor] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { cityId: true } }),
    prisma.tutor.findUnique({ where: { id: tutorId }, select: { user: { select: { cityId: true } } } }),
  ])
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })
  if (!tutor) return NextResponse.json({ error: "Tutor not found" }, { status: 404 })

  const projectScopeError = assertInScope(project.cityId, scope)
  if (projectScopeError) return projectScopeError
  const tutorScopeError = assertInScope(tutor.user.cityId, scope)
  if (tutorScopeError) return tutorScopeError

  // Enforce city scoping if both project and tutor have city assignments
  if (project.cityId && tutor.user.cityId && project.cityId !== tutor.user.cityId) {
    return NextResponse.json({ error: "Tutor and project are in different cities" }, { status: 400 })
  }

  await prisma.projectTutor.create({ data: { projectId, tutorId } })
  await logActivity(session.user.id, "assigned_tutor", "Project", projectId, `Tutor: ${tutorId}`)

  return NextResponse.redirect(new URL(`/dashboard/projects/${projectId}`, request.url), 303)
}
