import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import { STUDENT_GRADES, GRADE_LABELS } from "@/lib/constants"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const GRADE_ADVANCE: Record<string, string | null> = {
    ELEMENTARY: "SEC1_2",
    SEC1_2: "SEC3",
    SEC3: "SEC4_5",
    SEC4_5: "CEGEP",
    CEGEP: "UNI",
    UNI: null,
  }

  let advanced = 0
  for (const grade of STUDENT_GRADES) {
    const nextGrade = GRADE_ADVANCE[grade]
    if (!nextGrade) continue

    const projects = await prisma.project.findMany({
      where: { gradeLevel: grade, projectType: "STUDENT", status: "ACTIVE" },
    })

    for (const project of projects) {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          gradeLevel: nextGrade,
          name: project.name.replace(GRADE_LABELS[grade], GRADE_LABELS[nextGrade]),
        },
      })
      advanced++
    }
  }

  return NextResponse.redirect(
    new URL(`/dashboard/data-health?advanced=${advanced}`, request.url),
    303
  )
}
