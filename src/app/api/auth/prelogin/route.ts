import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { encode } from "next-auth/jwt"
import { prisma } from "@/lib/db"
import { verifyRecaptcha } from "@/lib/recaptcha"

export async function POST(req: Request) {
  try {
    const { email, password, recaptchaToken } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    if (!(await verifyRecaptcha(recaptchaToken))) {
      return NextResponse.json({ error: "reCAPTCHA verification failed" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET!

    if (user.totpEnabled && user.totpSecret) {
      const tempToken = await encode({
        token: { userId: user.id, email: user.email, type: "2fa" },
        secret,
        salt: "authjs.session-token",
        maxAge: 5 * 60,
      })
      return NextResponse.json({ needs2fa: true, tempToken, userName: user.name, userEmail: user.email })
    }

    const sessionToken = await encode({
      token: { id: user.id, email: user.email, name: user.name, role: user.role, sub: user.id },
      secret,
      salt: "authjs.session-token",
    })

    const isSecure = process.env.NODE_ENV === "production"
    const cookiePrefix = isSecure ? "__Secure-" : ""
    const response = NextResponse.json({ needs2fa: false })
    response.cookies.set(`${cookiePrefix}authjs.session-token`, sessionToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    })
    return response
  } catch (error) {
    console.error("Prelogin error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}