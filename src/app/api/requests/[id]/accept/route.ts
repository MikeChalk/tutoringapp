import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const tutoringRequest = await prisma.tutoringRequest.findUnique({ where: { id } })
  if (!tutoringRequest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const tutor = await prisma.tutor.findUnique({
    where: { userId: session.user.id },
  })

  if (!tutor || tutoringRequest.matchedTutorId !== tutor.id) {
    return NextResponse.json({ error: "Not your request" }, { status: 403 })
  }

  await prisma.tutoringRequest.update({
    where: { id },
    data: { status: "ACCEPTED" },
  })

  return NextResponse.redirect(new URL("/dashboard/requests", request.url), 303)
}
