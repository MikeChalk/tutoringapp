import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityAccessScope, assertInScope } from "@/lib/auth-helpers"
import { sendClientInviteEmail } from "@/lib/email"
import { logActivity } from "@/lib/activity"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return NextResponse.json({ error: "No city access" }, { status: 403 })

  const { id } = await params

  const registration = await prisma.registration.findUnique({
    where: { id },
    include: { cycle: { select: { cityId: true, name: true } }, client: { include: { user: { select: { name: true, email: true } } } }, invoice: { select: { id: true, number: true, status: true } } },
  })
  if (!registration) return NextResponse.json({ error: "Registration not found" }, { status: 404 })

  const scopeError = assertInScope(registration.cycle?.cityId || null, scope)
  if (scopeError) return scopeError

  const formData = await request.formData()
  const action = formData.get("_action") as string

  if (action === "confirm") {
    if (registration.status !== "PENDING") {
      return NextResponse.json({ error: "Registration is not pending" }, { status: 400 })
    }

    await prisma.registration.update({
      where: { id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    })

    if (registration.invoice && registration.invoice.status === "DRAFT") {
      await prisma.invoice.update({
        where: { id: registration.invoice.id },
        data: { status: "SENT", sentAt: new Date() },
      })

      if (registration.client?.user.email) {
        const invoiceUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/invoices/${registration.invoice.id}`
        sendClientInviteEmail(
          registration.client.user.email,
          registration.client.user.name,
          invoiceUrl,
          "client_invite"
        )
      }
    }

    await logActivity(session.user.id, "confirmed", "Registration", id, `Cycle: ${registration.cycle?.name}`)
    return NextResponse.redirect(new URL(`/dashboard/study-hall/${registration.cycleId}`, request.url), 303)
  }

  if (action === "cancel") {
    await prisma.registration.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    if (registration.invoice && registration.invoice.status === "DRAFT") {
      await prisma.invoice.delete({ where: { id: registration.invoice.id } })
    }

    await logActivity(session.user.id, "cancelled", "Registration", id, `Cycle: ${registration.cycle?.name}`)
    return NextResponse.redirect(new URL(`/dashboard/study-hall/${registration.cycleId}`, request.url), 303)
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
