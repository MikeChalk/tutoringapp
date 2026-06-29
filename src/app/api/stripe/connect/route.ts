import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { stripe } from "@/lib/stripe"

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tutor = await prisma.tutor.findUnique({ where: { userId: session.user.id } })
  if (!tutor) return NextResponse.json({ error: "Tutor not found" }, { status: 404 })

  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })

  try {
    // Create or retrieve Stripe Connect account
    let accountId = tutor.stripeConnectId

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: session.user.email || undefined,
      })
      accountId = account.id
      await prisma.tutor.update({
        where: { id: tutor.id },
        data: { stripeConnectId: accountId },
      })
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXTAUTH_URL}/dashboard/contract`,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard/contract`,
      type: "account_onboarding",
    })

    return NextResponse.redirect(accountLink.url)
  } catch (e: unknown) {
    console.error("[stripe/connect]", e)
    return NextResponse.json({ error: "Connection failed" }, { status: 500 })
  }
}
