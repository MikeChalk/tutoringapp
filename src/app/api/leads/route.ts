import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const leadId = formData.get("leadId") as string
  const action = formData.get("_action") as string

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (action === "contacted") {
    await prisma.lead.update({ where: { id: leadId }, data: { status: "CONTACTED" } })
    return NextResponse.redirect(new URL("/dashboard/leads", request.url), 303)
  }

  if (action === "convert") {
    // Create client from lead
    const existing = await prisma.user.findUnique({ where: { email: lead.email } })
    if (!existing) {
      const hashed = await bcrypt.hash(crypto.randomBytes(8).toString("hex"), 12)
      const user = await prisma.user.create({
        data: { name: lead.name, email: lead.email, password: hashed, role: "CLIENT", cityId: lead.cityId, signupToken: crypto.randomBytes(16).toString("hex") },
      })
      await prisma.client.create({ data: { userId: user.id, phone: lead.phone, type: "PARENT" } })
      await prisma.lead.update({ where: { id: leadId }, data: { status: "CONVERTED", convertedToClientId: user.id } })
    } else {
      // Link existing client
      const client = await prisma.client.findUnique({ where: { userId: existing.id } })
      if (client) {
        await prisma.lead.update({ where: { id: leadId }, data: { status: "CONVERTED", convertedToClientId: client.id } })
      }
    }
  }

  return NextResponse.redirect(new URL("/dashboard/leads", request.url), 303)
}
