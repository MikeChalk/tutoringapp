import { NextResponse } from "next/server"
import speakeasy from "speakeasy"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { code?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { code } = body

  if (!code) {
    return NextResponse.json({ error: "Missing verification code" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { totpSecret: true } })
  if (!user?.totpSecret) {
    return NextResponse.json({ error: "No 2FA secret found. Please generate a new one." }, { status: 400 })
  }

  const valid = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: "base32",
    token: code,
    window: 1,
  })

  if (!valid) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpEnabled: true },
  })

  return NextResponse.json({ success: true })
}