import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { rateLimitByIp } from "@/lib/rate-limit"
import crypto from "crypto"

const RESET_TOKEN_EXPIRY_MS = 1000 * 60 * 30 // 30 minutes
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"

export async function POST(request: Request) {
  const { allowed } = rateLimitByIp(request)
  if (!allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })

  const { email } = await request.json()
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({ success: true })
  }

  const token = crypto.randomBytes(32).toString("hex")
  const expiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS)

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  })

  const resetUrl = `${BASE_URL}/reset-password?token=${token}`

  try {
    const settings = await prisma.companySettings.findUnique({ where: { id: "main" }, select: { emailEnabled: true } })
    if (settings?.emailEnabled !== false && process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend")
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: "J.A.S.S. <info@jasstutors.com>",
        to: user.email,
        subject: "Reset Your Password — J.A.S.S.",
        text: `Hi ${user.name},\n\nWe received a request to reset your password. Click the link below to set a new password:\n\n${resetUrl}\n\nThis link expires in 30 minutes. If you didn't request this, you can safely ignore this email.\n\n— J.A.S.S. Tutors`,
      })
    }
  } catch {
    // Email failed silently — token still stored for manual use
  }

  return NextResponse.json({ success: true })
}