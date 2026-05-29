import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const templates = await prisma.contractTemplate.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  })

  return NextResponse.json({ templates })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const name = (formData.get("name") as string)?.trim()
  const type = (formData.get("type") as string) || "PRIVATE_TUTORING"
  const yearLevel = (formData.get("yearLevel") as string) || "1ST_YEAR"
  const terms = (formData.get("terms") as string) || ""
  const gradeLevels = (formData.get("gradeLevels") as string) || ""
  const startDate = (formData.get("startDate") as string) || null
  const endDate = (formData.get("endDate") as string) || null
  const rate = parseFloat((formData.get("rate") as string) || "0")
  const isDefault = formData.get("isDefault") === "on"

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  if (isDefault) {
    await prisma.contractTemplate.updateMany({
      where: { type, yearLevel, isDefault: true },
      data: { isDefault: false },
    })
  }

  const template = await prisma.contractTemplate.create({
    data: {
      name, type, yearLevel, terms, gradeLevels, rate,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isDefault,
    },
  })

  return NextResponse.redirect(new URL("/dashboard/contracts?tab=templates", request.url), 303)
}
