import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { encode } from "next-auth/jwt"
import { logActivity } from "@/lib/activity"

export async function POST() {
  const session = await auth()
  if (!session?.user?.impersonatedBy) {
    return NextResponse.json({ error: "Not impersonating" }, { status: 400 })
  }

  const admin = await prisma.user.findUnique({ where: { id: session.user.impersonatedBy } })
  if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 })

  const token = await encode({
    token: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
    salt: "authjs.session-token",
    secret: process.env.AUTH_SECRET!,
    maxAge: 86400,
  })

  const response = NextResponse.json({ success: true, redirect: "/dashboard" })

  logActivity(admin.id, "stopped_impersonating", "User", session.user.id, `Resumed own session as ${admin.name}`)

  response.cookies.set("authjs.session-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  })

  return response
}