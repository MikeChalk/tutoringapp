import { NextResponse } from "next/server"
import speakeasy from "speakeasy"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { secret, code } = await req.json()

  if (!secret || !code) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const valid = speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: code,
    window: 1,
  })

  if (!valid) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpSecret: secret, totpEnabled: true },
  })

  return NextResponse.json({ success: true })
}