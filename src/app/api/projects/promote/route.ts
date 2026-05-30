import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

const PROMOTION_MAP: Record<string, { grade: string; finish: boolean }> = {
  ELEMENTARY: { grade: "SEC1_2", finish: false },
  SEC1_2: { grade: "SEC3", finish: false },
  SEC3: { grade: "SEC4_5", finish: false },
  SEC4_5: { grade: "CEGEP", finish: false },
  CEGEP: { grade: "UNI", finish: false },
  UNI: { grade: "UNI", finish: true },
}

export async function POST() {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: {
      status: { in: ["IN_PROGRESS", "ON_HOLD"] },
    },
  })

  let promoted = 0

  for (const project of projects) {
    const mapping = PROMOTION_MAP[project.gradeLevel]
    if (!mapping) continue

    await prisma.project.update({
      where: { id: project.id },
      data: {
        gradeLevel: mapping.grade,
        ...(mapping.finish ? { status: "FINISHED" } : {}),
      },
    })
    promoted++
  }

  return NextResponse.json({ promoted })
}
