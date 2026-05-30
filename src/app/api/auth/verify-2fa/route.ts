import { NextResponse } from "next/server"
import speakeasy from "speakeasy"
import { decode, encode } from "next-auth/jwt"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { tempToken, totpCode } = await req.json()

    if (!tempToken || !totpCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET!

    const payload = await decode({ token: tempToken, secret, salt: "authjs.session-token" }) as Record<string, unknown> | null
    if (!payload?.userId || payload?.type !== "2fa") {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId as string } })
    if (!user?.totpSecret || !user.totpEnabled) {
      return NextResponse.json({ error: "2FA not enabled for this account" }, { status: 401 })
    }

    const valid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: "base32",
      token: totpCode,
      window: 1,
    })

    if (!valid) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 401 })
    }

    const sessionToken = await encode({
      token: { id: user.id, email: user.email, name: user.name, role: user.role, sub: user.id },
      secret,
      salt: "authjs.session-token",
    })

    const isSecure = process.env.NODE_ENV === "production"
    const cookiePrefix = isSecure ? "__Secure-" : ""
    const response = NextResponse.json({ success: true })
    response.cookies.set(`${cookiePrefix}authjs.session-token`, sessionToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    })
    return response
  } catch (error) {
    console.error("2FA verify error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}