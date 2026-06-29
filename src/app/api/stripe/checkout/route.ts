import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createCheckoutSession } from "@/lib/stripe"
import { isAdmin, getClientId, getCityAccessScope, assertInScope } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { invoiceId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const { invoiceId } = body
  if (!invoiceId) return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 })

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: { include: { user: { select: { email: true, name: true, cityId: true } } } } },
  })
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

  if (isAdmin(session.user.role)) {
    const scope = await getCityAccessScope(session.user.role, session.user.id)
    const scopeError = assertInScope(invoice.client?.user.cityId || null, scope)
    if (scopeError) return scopeError
  } else {
    const clientId = await getClientId(session.user.id, session.user.email)
    if (!clientId || clientId !== invoice.clientId || !["SENT", "OVERDUE"].includes(invoice.status)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

  if (!invoice.client) {
    return NextResponse.json({ error: "Invoice has no associated client" }, { status: 400 })
  }

  try {
    const stripeSession = await createCheckoutSession({
      ...invoice,
      client: invoice.client,
    })
    return NextResponse.json({ url: stripeSession.url })
  } catch (e: unknown) {
    console.error("[stripe/checkout]", e)
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 })
  }
}
