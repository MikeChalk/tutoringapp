import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityAccessScope, assertInScope } from "@/lib/auth-helpers"

const VALID_ACTIVITIES = [
  "Active",
  "Inactive - Released",
  "Inactive - No Time",
  "Inactive - Other",
  "Unsure",
]

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return NextResponse.json({ error: "No city access" }, { status: 403 })

  let body: { tutorId?: string; activity?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { tutorId, activity } = body

  if (!tutorId || !activity) {
    return NextResponse.json({ error: "tutorId and activity are required" }, { status: 400 })
  }

  if (!VALID_ACTIVITIES.includes(activity)) {
    return NextResponse.json({ error: "Invalid activity status" }, { status: 400 })
  }

  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId }, select: { user: { select: { cityId: true } } } })
  if (!tutor) return NextResponse.json({ error: "Tutor not found" }, { status: 404 })

  const scopeError = assertInScope(tutor.user.cityId, scope)
  if (scopeError) return scopeError

  const updateData: Record<string, unknown> = { activity }
  if (activity === "Active") {
    updateData.isActive = true
  } else if (activity.startsWith("Inactive")) {
    updateData.isActive = false
  }

  await prisma.tutor.update({
    where: { id: tutorId },
    data: updateData,
  })

  return NextResponse.json({ success: true })
}
