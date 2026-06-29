import { NextResponse } from "next/server"
import speakeasy from "speakeasy"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const secret = speakeasy.generateSecret({ length: 20, name: `J.A.S.S. (${session.user.email})` })

  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpSecret: secret.base32, totpEnabled: false },
  })

  return NextResponse.json({
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
  })
}