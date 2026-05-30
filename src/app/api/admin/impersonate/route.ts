import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import { SignJWT } from "jose"

function getSecret(): Uint8Array {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET environment variable is not set")
  return new TextEncoder().encode(process.env.AUTH_SECRET)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // Create JWT for the target user
  const token = await new SignJWT({
    id: target.id,
    email: target.email,
    name: target.name,
    role: target.role,
    impersonatedBy: session.user.id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getSecret())

  const response = NextResponse.json({ success: true, redirect: "/dashboard" })

  response.cookies.set("authjs.session-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  })

  return response
}
