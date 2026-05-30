import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import { sendClientInviteEmail } from "@/lib/email"

export async function POST(request: Request) {
  const body = await request.text()
  const sig = (await headers()).get("stripe-signature") || ""

  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      metadata?: { invoiceId?: string }
      client_reference_id?: string
      payment_intent?: string | { id: string }
    }

    const invoiceId = session.metadata?.invoiceId || session.client_reference_id
    if (invoiceId) {
      let receiptUrl: string | null = null

      // Try to get receipt URL from payment intent
      if (session.payment_intent && stripe) {
        try {
          const piId = typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id
          const pi = await stripe.paymentIntents.retrieve(piId)
          const chargeId = pi.latest_charge
          if (chargeId && typeof chargeId === "string") {
            const charge = await stripe.charges.retrieve(chargeId)
            receiptUrl = charge.receipt_url || null
          }
        } catch { /* receipt URL not available */ }
      }

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paymentGateway: "stripe",
          ...(receiptUrl && { receiptUrl }),
        },
      })

      // Cascade paidAt to underlying hour logs
      const items = await prisma.invoiceItem.findMany({ where: { invoiceId }, select: { hourLogId: true } })
      const logIds = items.map(i => i.hourLogId).filter(Boolean) as string[]
      if (logIds.length > 0) {
        await prisma.hourLog.updateMany({ where: { id: { in: logIds } }, data: { paidAt: new Date() } })
      }

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { client: { include: { user: { select: { name: true, email: true } } } } },
      })
      if (invoice?.client?.user.email) {
        sendClientInviteEmail(invoice.client.user.email, invoice.client.user.name,
          `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/invoices/${invoiceId}`, "payment_received")
      }
    }
  }

  return NextResponse.json({ received: true })
}

export const dynamic = "force-dynamic"
