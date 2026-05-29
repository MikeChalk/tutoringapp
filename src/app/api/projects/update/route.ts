import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const projectId = formData.get("projectId") as string
  const action = formData.get("_action") as string

  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 })

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
  const clientId = formData.get("clientId") as string
  const cityId = formData.get("cityId") as string

  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 })

  await prisma.project.update({
    where: { id: projectId },
    data: {
      name,
      status: status || undefined,
      gradeLevel: gradeLevel || undefined,
      school: school || "",
      subjects: subjects || "",
      description: description || null,
      clientId: clientId || null,
      cityId: cityId || null,
    },
  })

  return NextResponse.redirect(new URL(`/dashboard/projects/${projectId}`, request.url), 303)
}
