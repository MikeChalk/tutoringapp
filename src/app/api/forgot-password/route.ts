import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (user) {
    console.log(`[PASSWORD RESET] Requested for: ${email}`)
    // In production: generate token, save to user, send email with link
  }

  return NextResponse.json({ success: true })
}
