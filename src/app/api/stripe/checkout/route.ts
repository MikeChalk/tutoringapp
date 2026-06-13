import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createCheckoutSession } from "@/lib/stripe"
import { isAdmin, getClientId } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  const session = await auth()
  const { invoiceId } = await request.json()
  if (!invoiceId) return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 })

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: { include: { user: { select: { email: true, name: true } } } } },
  })
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

  // Only the invoice owner (client) or an admin can create a checkout session
if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
if (!isAdmin(session.user.role)) {
  const clientId = await getClientId(session.user.id, (session.user as { email?: string }).email || "")
  if (!clientId || clientId !== invoice.clientId || !["SENT", "OVERDUE"].includes(invoice.status)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

  try {
    const stripeSession = await createCheckoutSession(invoice)
    return NextResponse.json({ url: stripeSession.url })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Checkout failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
