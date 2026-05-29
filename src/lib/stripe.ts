import Stripe from "stripe"

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-06-30.acacia" as any })
  : null

export async function createCheckoutSession(invoice: {
  id: string; number: string; totalAmount: number
  client: { user: { email: string; name: string } }
}) {
  if (!stripe) throw new Error("Stripe not configured")

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: invoice.client.user.email,
    client_reference_id: invoice.id,
    line_items: [{
      price_data: {
        currency: "cad",
        product_data: { name: `Invoice ${invoice.number}` },
        unit_amount: Math.round(invoice.totalAmount * 100),
      },
      quantity: 1,
    }],
    success_url: `${process.env.NEXTAUTH_URL}/dashboard/invoices/${invoice.id}?paid=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/invoices/${invoice.id}`,
    metadata: { invoiceId: invoice.id },
  })

  return session
}
