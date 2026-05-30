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
    const session = event.data.object as { metadata?: { invoiceId?: string }; client_reference_id?: string }
    const invoiceId = session.metadata?.invoiceId || session.client_reference_id
    if (invoiceId) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "PAID", paidAt: new Date(), paymentGateway: "stripe" },
      })
      // Send confirmation
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { client: { include: { user: { select: { name: true, email: true } } } } } })
      if (invoice?.client?.user.email) {
        sendClientInviteEmail(invoice.client.user.email, invoice.client.user.name,
          `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/invoices/${invoiceId}`, "payment_received")
      }
    }
  }

  return NextResponse.json({ received: true })
}

export const dynamic = "force-dynamic"
