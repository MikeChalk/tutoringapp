import { NextResponse } from "next/server"
import speakeasy from "speakeasy"
import { auth } from "@/lib/auth"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const secret = speakeasy.generateSecret({ length: 20, name: `J.A.S.S. (${session.user.email})` })

  return NextResponse.json({
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
  })
}