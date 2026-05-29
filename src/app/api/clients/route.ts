import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
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

  const tempPassword = Math.random().toString(36).slice(2, 10)
  const hashed = await bcrypt.hash(tempPassword, 12)

  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: "CLIENT", cityId },
  })

  await prisma.client.create({
    data: { userId: user.id, type: clientType, company, phone, address },
  })

  return NextResponse.redirect(new URL("/dashboard/clients", request.url), 303)
}
