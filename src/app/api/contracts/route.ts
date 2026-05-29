import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const tutorId = formData.get("tutorId") as string
  const type = formData.get("type") as string
  const yearLevel = formData.get("yearLevel") as string
  const terms = formData.get("terms") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string

  if (!tutorId || !type || !yearLevel || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  // Deactivate existing contract
  await prisma.contract.updateMany({
    where: { tutorId, status: "ACTIVE" },
    data: { status: "EXPIRED" },
  })

  const contract = await prisma.contract.create({
    data: {
      tutorId,
      type,
      yearLevel,
      terms: terms || "",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  })

  // Update tutor's tenure
  await prisma.tutor.update({
    where: { id: tutorId },
    data: { tenure: yearLevel },
  })

  return NextResponse.redirect(new URL(`/dashboard/tutors/${tutorId}`, request.url), 303)
}
