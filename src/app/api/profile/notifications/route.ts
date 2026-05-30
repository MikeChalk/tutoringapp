import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const emailNotifications = formData.get("emailNotifications") === "on"
  const smsNotifications = formData.get("smsNotifications") === "on"

  await prisma.user.update({
    where: { id: session.user.id },
    data: { emailNotifications, smsNotifications },
  })

  return NextResponse.redirect(new URL("/dashboard/profile", request.url), 303)
}
