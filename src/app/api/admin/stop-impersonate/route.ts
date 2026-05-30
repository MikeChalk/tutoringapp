import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { encode } from "next-auth/jwt"
import { logActivity } from "@/lib/activity"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.impersonatedBy) {
    return NextResponse.redirect(new URL("/dashboard?error=not-impersonating", request.url))
  }

  const admin = await prisma.user.findUnique({ where: { id: session.user.impersonatedBy } })
  if (!admin) return NextResponse.redirect(new URL("/dashboard?error=admin-not-found", request.url))

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

  logActivity(admin.id, "stopped_impersonating", "User", session.user.id, `Resumed own session as ${admin.name}`)

  const response = NextResponse.redirect(new URL("/dashboard", request.url))

  response.cookies.set("authjs.session-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  })

  return response
}