import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityFilter } from "@/lib/auth-helpers"
import { GRADE_ADVANCE } from "@/lib/constants"

export async function POST() {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cityFilter = await getCityFilter(session.user.role, session.user.id)

  const projects = await prisma.project.findMany({
    where: {
      status: { in: ["IN_PROGRESS", "ON_HOLD"] },
      ...cityFilter,
    },
  })

  let promoted = 0

  for (const project of projects) {
    const nextGrade = GRADE_ADVANCE[project.gradeLevel]
    if (nextGrade === undefined) continue

    await prisma.project.update({
      where: { id: project.id },
      data: {
        gradeLevel: nextGrade || project.gradeLevel,
        ...(nextGrade === null ? { status: "FINISHED" } : {}),
      },
    })
    promoted++
  }

  return NextResponse.json({ promoted })
}
