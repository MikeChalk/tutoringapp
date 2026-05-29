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
  const tutorId = formData.get("tutorId") as string

  if (!projectId || !tutorId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const existing = await prisma.projectTutor.findFirst({ where: { projectId, tutorId } })
  if (!existing) {
    await prisma.projectTutor.create({ data: { projectId, tutorId } })
  }

  return NextResponse.redirect(new URL(`/dashboard/projects/${projectId}`, request.url), 303)
}
