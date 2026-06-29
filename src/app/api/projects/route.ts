import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getActiveCityId, getCityAccessScope } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const name = (formData.get("name") as string)?.trim()
  const description = formData.get("description") as string
  const projectType = (formData.get("projectType") as string) || "STUDENT"
  const gradeLevel = (formData.get("gradeLevel") as string) || (projectType === "STUDY_HALL" ? "STUDY_HALL" : "ELEMENTARY")
  const subjects = formData.get("subjects") as string
  const clientId = formData.get("clientId") as string
  const cityId = formData.get("cityId") as string
  const school = formData.get("school") as string

  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 })
  }

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") {
    return NextResponse.json({ error: "No city assigned to your account" }, { status: 403 })
  }
  const cityIdFinal = scope.kind === "single" ? scope.cityId : (cityId || await getActiveCityId(session.user.role, session.user.id)) || undefined

  await prisma.project.create({
    data: {
      name,
      description: description || null,
      gradeLevel,
      subjects: subjects || "",
      clientId: clientId || null,
      cityId: cityIdFinal,
      projectType,
      school: school || "",
    },
  })

  return NextResponse.redirect(new URL("/dashboard/projects", request.url), 303)
}
