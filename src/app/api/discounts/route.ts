import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

export async function GET() {
  const codes = await prisma.discountCode.findMany({ orderBy: { code: "asc" } })
  return NextResponse.json({ codes })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const action = formData.get("_action") as string

  if (action === "delete") {
    const id = formData.get("id") as string
    if (id) await prisma.discountCode.delete({ where: { id } })
    return NextResponse.redirect(new URL("/dashboard/discounts", request.url), 303)
  }

  const code = (formData.get("code") as string)?.trim().toUpperCase()
  const description = (formData.get("description") as string)?.trim() || ""
  const discountPct = parseFloat((formData.get("discountPct") as string) || "0")
  const discountAmt = parseFloat((formData.get("discountAmt") as string) || "0")
  const maxUses = parseInt((formData.get("maxUses") as string) || "0")

  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 })

  await prisma.discountCode.create({
    data: { code, description, discountPct, discountAmt, maxUses, isActive: true },
  })

  return NextResponse.redirect(new URL("/dashboard/discounts", request.url), 303)
}
