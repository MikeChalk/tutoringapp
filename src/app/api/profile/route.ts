import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await request.formData()
  const action = formData.get("_action") as string

  if (action === "profile") {
    const name = (formData.get("name") as string)?.trim()
    const email = (formData.get("email") as string)?.trim().toLowerCase()
    if (!name || !email) return NextResponse.json({ error: "Name and email required" }, { status: 400 })

    if (email !== session.user.email) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }

    await prisma.user.update({ where: { id: session.user.id }, data: { name, email } })
    return NextResponse.json({ success: true })
  }

  if (action === "password") {
    const current = formData.get("currentPassword") as string
    const newPass = formData.get("newPassword") as string
    if (!current || !newPass || newPass.length < 6) return NextResponse.json({ error: "Invalid password" }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const valid = await bcrypt.compare(current, user.password)
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })

    const hashed = await bcrypt.hash(newPass, 12)
    await prisma.user.update({ where: { id: session.user.id }, data: { password: hashed } })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
