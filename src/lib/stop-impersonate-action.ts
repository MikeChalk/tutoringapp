"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { encode } from "next-auth/jwt"
import { cookies } from "next/headers"
import { logActivity } from "@/lib/activity"
import { redirect } from "next/navigation"

export async function stopImpersonating() {
  const session = await auth()
  if (!session?.user?.impersonatedBy) {
    throw new Error("Not impersonating")
  }

  const admin = await prisma.user.findUnique({ where: { id: session.user.impersonatedBy } })
  if (!admin) throw new Error("Admin not found")

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

  const cookieStore = await cookies()
  cookieStore.set("authjs.session-token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  })

  redirect("/dashboard")
}