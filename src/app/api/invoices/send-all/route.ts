import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const drafts = await prisma.invoice.findMany({
    where: { status: "DRAFT" },
    select: { id: true },
  })

  let sent = 0
  for (const d of drafts) {
    await prisma.invoice.update({
      where: { id: d.id },
      data: { status: "SENT", sentAt: new Date() },
    })
    sent++
  }

  return NextResponse.redirect(new URL(`/dashboard/invoices?status=DRAFT`, request.url), 303)
}
