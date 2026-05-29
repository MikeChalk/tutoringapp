import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const phone = formData.get("phone") as string
  const subject = formData.get("subject") as string
  const description = formData.get("description") as string
  const preferredSchedule = formData.get("preferredSchedule") as string
  const matchedTutorId = formData.get("matchedTutorId") as string

  if (!name || !email || !subject) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  await prisma.tutoringRequest.create({
    data: {
      name,
      email,
      phone: phone || null,
      subject,
      description: description || null,
      preferredSchedule: preferredSchedule || null,
      matchedTutorId: matchedTutorId || null,
      status: matchedTutorId ? "MATCHED" : "NEW",
    },
  })

  return NextResponse.redirect(new URL("/dashboard/requests", request.url), 303)
}
