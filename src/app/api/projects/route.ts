import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, isSuperAdmin, getActiveCityId } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const name = (formData.get("name") as string)?.trim()
  const description = formData.get("description") as string
  const gradeLevel = (formData.get("gradeLevel") as string) || "ELEMENTARY"
  const subjects = formData.get("subjects") as string
  const clientId = formData.get("clientId") as string
  const cityId = formData.get("cityId") as string
  const projectType = (formData.get("projectType") as string) || "STUDENT"

  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 })
  }

  const cityIdFinal = cityId || await getActiveCityId(session.user.role, session.user.id) || undefined

  await prisma.project.create({
    data: {
      name,
      description: description || null,
      gradeLevel,
      subjects: subjects || "",
      clientId: clientId || null,
      cityId: cityIdFinal,
      projectType,
    },
  })

  return NextResponse.redirect(new URL("/dashboard/projects", request.url), 303)
}
