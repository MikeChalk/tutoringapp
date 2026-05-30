"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isSuperAdmin } from "@/lib/auth-helpers"
import { encode } from "next-auth/jwt"
import { cookies } from "next/headers"
import { logActivity } from "@/lib/activity"
import { redirect } from "next/navigation"

export async function impersonateUser(targetUserId: string) {
  const session = await auth()
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    throw new Error("Unauthorized")
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } })
  if (!target) throw new Error("User not found")

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

  const cookieStore = await cookies()
  cookieStore.set("authjs.session-token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  })

  redirect("/dashboard")
}