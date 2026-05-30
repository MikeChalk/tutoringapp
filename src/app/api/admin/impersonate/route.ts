import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isSuperAdmin } from "@/lib/auth-helpers"
import { encode } from "next-auth/jwt"
import { logActivity } from "@/lib/activity"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const token = await encode({
    token: {
      id: target.id,
      email: target.email,
      name: target.name,
      role: target.role,
      impersonatedBy: session.user.id,
    },
    salt: "authjs.session-token",
    secret: process.env.AUTH_SECRET!,
    maxAge: 3600,
  })

  const response = NextResponse.json({ success: true, redirect: "/dashboard" })

  logActivity(session.user.id, "impersonated", "User", target.id, `Impersonated ${target.name} (${target.email})`)

  response.cookies.set("authjs.session-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  })

  return response
}