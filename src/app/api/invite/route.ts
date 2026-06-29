import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityAccessScope, assertInScope } from "@/lib/auth-helpers"
import { sendClientInviteEmail, sendOnboardingEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return NextResponse.json({ error: "No city access" }, { status: 403 })

  let body: { userId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const { userId } = body
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { client: true, tutor: true, city: { select: { id: true } } },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const scopeError = assertInScope(user.cityId, scope)
  if (scopeError) return scopeError

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

  if (user.client) {
    const signupToken = user.signupToken || crypto.randomBytes(16).toString("hex")
    await prisma.user.update({ where: { id: user.id }, data: { signupToken } })
    const inviteUrl = `${baseUrl}/invite/${signupToken}`
    await sendClientInviteEmail(user.email, user.name, inviteUrl)
    return NextResponse.json({ success: true, message: "Invite sent" })
  }

  if (user.tutor) {
    const signupToken = user.signupToken || crypto.randomBytes(16).toString("hex")
    await prisma.user.update({ where: { id: user.id }, data: { signupToken } })
    const onboardingUrl = `${baseUrl}/onboarding/${signupToken}`
    await sendOnboardingEmail(user.email, user.name, `Please complete your onboarding by visiting: ${onboardingUrl}`)
    return NextResponse.json({ success: true, message: "Onboarding invite sent" })
  }

  return NextResponse.json({ error: "User is not a client or tutor" }, { status: 400 })
}