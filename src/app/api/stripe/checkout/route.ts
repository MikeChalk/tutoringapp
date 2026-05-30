import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { createCheckoutSession } from "@/lib/stripe"

export async function POST(request: Request) {
  const { invoiceId } = await request.json()
  if (!invoiceId) return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 })

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: { include: { user: { select: { email: true, name: true } } } } },
  })
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

  try {
    const session = await createCheckoutSession(invoice)
    return NextResponse.json({ url: session.url })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Checkout failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
