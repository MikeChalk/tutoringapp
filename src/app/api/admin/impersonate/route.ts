import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isSuperAdmin } from "@/lib/auth-helpers"
import { encode } from "next-auth/jwt"
import { logActivity } from "@/lib/activity"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    return NextResponse.redirect(new URL("/dashboard?error=unauthorized", request.url))
  }

  const contentType = request.headers.get("content-type") || ""
  let userId: string | null = null

  if (contentType.includes("application/json")) {
    const body = await request.json()
    userId = body.userId
  } else {
    const formData = await request.formData()
    userId = formData.get("userId") as string
  }

  if (!userId) return NextResponse.redirect(new URL("/dashboard?error=missing", request.url))

  const target = await prisma.user.findUnique({ where: { id: userId } })
  if (!target) return NextResponse.redirect(new URL("/dashboard?error=notfound", request.url))

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

  logActivity(session.user.id, "impersonated", "User", target.id, `Impersonated ${target.name} (${target.email})`)

  const response = NextResponse.redirect(new URL("/dashboard", request.url))

  response.cookies.set("authjs.session-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  })

  return response
}