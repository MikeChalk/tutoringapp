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
  const name = (formData.get("name") as string)?.trim()
  const status = formData.get("status") as string
  const gradeLevel = formData.get("gradeLevel") as string
  const school = formData.get("school") as string
  const subjects = formData.get("subjects") as string
  const description = formData.get("description") as string

  if (!projectId || !name) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      name,
      status: status || undefined,
      gradeLevel: gradeLevel || undefined,
      school: school || "",
      subjects: subjects || "",
      description: description || null,
    },
  })

  return NextResponse.redirect(new URL(`/dashboard/projects/${projectId}`, request.url), 303)
}
