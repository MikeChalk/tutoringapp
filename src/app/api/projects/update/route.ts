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
  const action = formData.get("_action") as string

  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 })

  const existing = await prisma.project.findUnique({ where: { id: projectId }, select: { cityId: true } })
  if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const scopeError = assertInScope(existing.cityId, scope)
  if (scopeError) return scopeError

  if (action === "delete") {
    await prisma.project.delete({ where: { id: projectId } })
    return NextResponse.redirect(new URL("/dashboard/projects", request.url), 303)
  }

  const name = (formData.get("name") as string)?.trim()
  const status = formData.get("status") as string
  const gradeLevel = formData.get("gradeLevel") as string
  const school = formData.get("school") as string
  const subjects = formData.get("subjects") as string
  const description = formData.get("description") as string
  const formClientId = formData.get("clientId") as string
  const formCityId = formData.get("cityId") as string

  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 })

  const cityId = scope.kind === "single" ? scope.cityId : (formCityId || null)
  const clientId = formClientId || null

  await prisma.project.update({
    where: { id: projectId },
    data: {
      name,
      status: status || undefined,
      gradeLevel: gradeLevel || undefined,
      school: school || "",
      subjects: subjects || "",
      description: description || null,
      clientId,
      cityId,
    },
  })

  return NextResponse.redirect(new URL(`/dashboard/projects/${projectId}`, request.url), 303)
}
