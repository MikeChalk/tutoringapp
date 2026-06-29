import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityAccessScope, assertInScope } from "@/lib/auth-helpers"
import { sendClientInviteEmail } from "@/lib/email"
import { logActivity } from "@/lib/activity"
import crypto from "crypto"

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
    include: {
      cycle: { select: { cityId: true, name: true, status: true } },
      client: { include: { user: { select: { id: true, name: true, email: true, signupToken: true } } } },
      invoice: { select: { id: true, number: true, status: true } },
    },
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
    // H4: do not confirm (and email an invoice) for a cycle that is not OPEN.
    // An admin who closed the cycle should not be able to send invoices from it.
    if (registration.cycle?.status !== "OPEN") {
      return NextResponse.json({ error: "Cannot confirm a registration for a cycle that is not open" }, { status: 400 })
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
        // H3: ensure the parent has a path to set a password. If their account
        // is still pending activation (signupToken present), refresh the token
        // and send the invite link so they can set a password and view/pay the
        // invoice. The invoice link is always included for reference.
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const invoiceUrl = `${baseUrl}/dashboard/invoices/${registration.invoice.id}`
        let inviteUrl: string | null = null
        if (registration.client.user.signupToken) {
          const token = registration.client.user.signupToken || crypto.randomBytes(16).toString("hex")
          await prisma.user.update({ where: { id: registration.client.user.id }, data: { signupToken: token } })
          inviteUrl = `${baseUrl}/invite/${token}`
        }
        sendClientInviteEmail(
          registration.client.user.email,
          registration.client.user.name,
          inviteUrl || invoiceUrl,
          "client_invite",
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
      const invNumber = registration.invoice.number
      await prisma.invoice.delete({ where: { id: registration.invoice.id } })
      // L6: record the invoice deletion in the activity trail.
      await logActivity(session.user.id, "deleted", "Invoice", invNumber, `Cancelled registration ${id} (cycle: ${registration.cycle?.name})`)
    }

    await logActivity(session.user.id, "cancelled", "Registration", id, `Cycle: ${registration.cycle?.name}`)
    return NextResponse.redirect(new URL(`/dashboard/study-hall/${registration.cycleId}`, request.url), 303)
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}