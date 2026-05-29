import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  const { name, email, password, role } = await request.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  if (role === "ADMIN" || role === "CLIENT") {
    return NextResponse.json({ error: "Cannot register as this role" }, { status: 403 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: role || "CLIENT",
    },
  })

  if (role === "TUTOR") {
    await prisma.tutor.create({
      data: { userId: user.id },
    })
  } else if (role === "CLIENT") {
    await prisma.client.create({
      data: { userId: user.id },
    })
  }

  return NextResponse.json({ success: true, userId: user.id })
}
