import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const projectId = formData.get("projectId") as string
  const tutorId = formData.get("tutorId") as string
  const date = formData.get("date") as string
  const hours = parseFloat(formData.get("hours") as string)
  const description = formData.get("description") as string

  if (!projectId || !tutorId || !date || !hours) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  await prisma.hourLog.create({
    data: {
      tutorId,
      projectId,
      date: new Date(date),
      hours,
      description: description || null,
    },
  })

  return NextResponse.redirect(new URL("/dashboard/hours", request.url), 303)
}
