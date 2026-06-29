import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityAccessScope, assertInScope } from "@/lib/auth-helpers"
import { stripe } from "@/lib/stripe"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return NextResponse.json({ error: "No city access" }, { status: 403 })

  const formData = await request.formData()
  const tutorId = formData.get("tutorId") as string
  const amount = parseFloat((formData.get("amount") as string) || "0")

  if (!tutorId || isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: "Missing tutorId or amount" }, { status: 400 })
  }

  const tutor = await prisma.tutor.findUnique({ where: { id: tutorId }, select: { stripeConnectId: true, user: { select: { cityId: true } } } })
  if (!tutor?.stripeConnectId) {
    return NextResponse.json({ error: "Tutor not connected to Stripe" }, { status: 400 })
  }

  const scopeError = assertInScope(tutor.user.cityId, scope)
  if (scopeError) return scopeError

  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })

  const unpaidHours = await prisma.hourLog.findMany({
    where: { tutorId, paidAt: null },
    orderBy: { date: "asc" },
    select: { id: true, hours: true, tutorPayRate: true },
  })

  let remaining = amount
  const hourLogIds: string[] = []
  for (const h of unpaidHours) {
    const hPay = h.hours * h.tutorPayRate
    if (hPay <= remaining + 0.01) {
      hourLogIds.push(h.id)
      remaining -= hPay
    }
  }

  if (hourLogIds.length === 0) {
    return NextResponse.json({ error: "No unpaid hours match the payout amount" }, { status: 400 })
  }

  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: "cad",
      destination: tutor.stripeConnectId,
      description: `Payment for tutoring services`,
    })

    const now = new Date()
    await prisma.hourLog.updateMany({
      where: { id: { in: hourLogIds } },
      data: { paidAt: now },
    })

    const transferUrl = `https://dashboard.stripe.com/connect/transfers/${transfer.id}`
    await prisma.expense.updateMany({
      where: { hourLog: { id: { in: hourLogIds } }, receiptUrl: null },
      data: { receiptUrl: transferUrl },
    })
  } catch (e: unknown) {
    console.error("[payout]", e)
    return NextResponse.json({ error: "Payout failed" }, { status: 500 })
  }

  return NextResponse.redirect(new URL("/dashboard/payments-admin", request.url), 303)
}
