import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import { stripe } from "@/lib/stripe"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const tutorId = formData.get("tutorId") as string
  const amount = parseFloat((formData.get("amount") as string) || "0")

  if (!tutorId || amount <= 0) {
    return NextResponse.json({ error: "Missing tutorId or amount" }, { status: 400 })
  }

  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId } })
  if (!tutor?.stripeConnectId) {
    return NextResponse.json({ error: "Tutor not connected to Stripe" }, { status: 400 })
  }

  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })

  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: "cad",
      destination: tutor.stripeConnectId,
      description: `Payment for tutoring services`,
    })

    // Mark all unpaid hour logs as paid
    const now = new Date()
    await prisma.hourLog.updateMany({
      where: { tutorId, paidAt: null },
      data: { paidAt: now },
    })

    // Store receipt URL on the corresponding expenses
    const transferUrl = `https://dashboard.stripe.com/connect/transfers/${transfer.id}`
    await prisma.expense.updateMany({
      where: { hourLog: { tutorId, paidAt: now }, receiptUrl: null },
      data: { receiptUrl: transferUrl },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Payout failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.redirect(new URL("/dashboard/payments-admin", request.url), 303)
}
