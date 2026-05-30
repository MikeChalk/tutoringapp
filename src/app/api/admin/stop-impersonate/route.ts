import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { SignJWT } from "jose"

function getSecret(): Uint8Array {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET environment variable is not set")
  return new TextEncoder().encode(process.env.AUTH_SECRET)
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.impersonatedBy) {
    return NextResponse.json({ error: "Not impersonating" }, { status: 400 })
  }

  const admin = await prisma.user.findUnique({ where: { id: session.user.impersonatedBy } })
  if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 })

  const token = await new SignJWT({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret())

  const response = NextResponse.json({ success: true, redirect: "/dashboard" })

  response.cookies.set("authjs.session-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  })

  return response
}
