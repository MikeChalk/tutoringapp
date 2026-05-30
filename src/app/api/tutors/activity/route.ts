import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

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

  const { tutorId, activity } = await request.json()

  if (!tutorId || !activity) {
    return NextResponse.json({ error: "tutorId and activity are required" }, { status: 400 })
  }

  if (!VALID_ACTIVITIES.includes(activity)) {
    return NextResponse.json({ error: "Invalid activity status" }, { status: 400 })
  }

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
