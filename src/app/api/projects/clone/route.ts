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
  const projectId = formData.get("projectId") as string
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 })

  const original = await prisma.project.findUnique({ where: { id: projectId } })
  if (!original) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const scopeError = assertInScope(original.cityId, scope)
  if (scopeError) return scopeError

  const clone = await prisma.project.create({
    data: {
      name: `${original.name} (Copy)`,
      description: original.description,
      clientId: original.clientId,
      gradeLevel: original.gradeLevel,
      subjects: original.subjects,
      projectType: original.projectType,
      school: original.school,
      status: "ON_HOLD",
      cityId: original.cityId,
    },
  })

  return NextResponse.redirect(new URL(`/dashboard/projects/${clone.id}`, request.url), 303)
}
