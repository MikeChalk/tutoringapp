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
  const tutorId = formData.get("tutorId") as string

  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId } })
  if (!tutor) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.tutor.update({
    where: { id: tutorId },
    data: { isActive: !tutor.isActive },
  })

  return NextResponse.redirect(new URL(`/dashboard/tutors/${tutorId}`, request.url), 303)
}
