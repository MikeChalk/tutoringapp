import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import { sendClientInviteEmail } from "@/lib/email"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const action = formData.get("_action") as string

  if (action === "delete") {
    const id = formData.get("id") as string
    if (id) {
      const client = await prisma.client.findUnique({ where: { id }, select: { userId: true } })
      if (client) {
        await prisma.$transaction([
          prisma.invoiceItem.deleteMany({ where: { invoice: { clientId: id } } }),
          prisma.invoice.deleteMany({ where: { clientId: id } }),
          prisma.tutoringRequest.updateMany({ where: { clientId: id }, data: { clientId: null } }),
          prisma.project.updateMany({ where: { clientId: id }, data: { clientId: null } }),
          prisma.client.delete({ where: { id } }),
          prisma.user.delete({ where: { id: client.userId } }),
        ])
      }
    }
    return NextResponse.redirect(new URL("/dashboard/clients", request.url), 303)
  }

  const name = (formData.get("name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const clientType = (formData.get("clientType") as string) || "PARENT"
  const company = (formData.get("company") as string)?.trim() || null
  const phone = (formData.get("phone") as string)?.trim() || null
  const address = (formData.get("address") as string)?.trim() || null
  const cityId = (formData.get("cityId") as string) || null

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 })
  }

  const tempPassword = crypto.randomBytes(8).toString("hex")
  const hashed = await bcrypt.hash(tempPassword, 12)
  const signupToken = crypto.randomBytes(16).toString("hex")

  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: "CLIENT", cityId, signupToken },
  })

  await prisma.client.create({
    data: { userId: user.id, type: clientType, company, phone, address },
  })

  const inviteUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/invite/${signupToken}`
  await sendClientInviteEmail(email, name, inviteUrl)

  return NextResponse.redirect(new URL("/dashboard/clients", request.url), 303)
}
