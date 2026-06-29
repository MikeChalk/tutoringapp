import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { rateLimitByIp } from "@/lib/rate-limit"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  const { allowed } = rateLimitByIp(request)
  if (!allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })

  let body: { token?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const { token, password } = body

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