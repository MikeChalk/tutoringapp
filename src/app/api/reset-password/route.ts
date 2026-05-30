import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  const { token, password } = await request.json()

  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: "Invalid request. Password must be at least 8 characters." }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gte: new Date() },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "This reset link has expired or is invalid. Please request a new one." }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      resetToken: null,
      resetTokenExpiry: null,
    },
  })

  return NextResponse.json({ success: true })
}