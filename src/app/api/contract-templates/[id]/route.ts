import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await props.params
  const formData = await request.formData()

  const data: Record<string, unknown> = {}
  const name = formData.get("name")
  if (name) data.name = name
  const type = formData.get("type")
  if (type) data.type = type
  const yearLevel = formData.get("yearLevel")
  if (yearLevel) data.yearLevel = yearLevel
  const terms = formData.get("terms")
  if (terms !== null) data.terms = terms
  const gradeLevels = formData.get("gradeLevels")
  if (gradeLevels !== null) data.gradeLevels = gradeLevels
  if (formData.get("isDefault") === "on") data.isDefault = true
  else if (formData.has("isDefault")) data.isDefault = false

  if (data.isDefault) {
    const current = await prisma.contractTemplate.findUnique({ where: { id } })
    if (current) {
      await prisma.contractTemplate.updateMany({
        where: { type: (data.type as string) || current.type, yearLevel: (data.yearLevel as string) || current.yearLevel, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    }
  }

  await prisma.contractTemplate.update({ where: { id }, data })

  return NextResponse.redirect(new URL("/dashboard/contracts", request.url), 303)
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await props.params
  const formData = await request.formData()
  const method = (formData.get("_method") as string) || "PUT"

  if (method === "DELETE") {
    await prisma.contractTemplate.delete({ where: { id } })
    return NextResponse.redirect(new URL("/dashboard/contracts?tab=templates", request.url), 303)
  }

  return PUT(request, props)
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await props.params
  await prisma.contractTemplate.delete({ where: { id } })

  return NextResponse.redirect(new URL("/dashboard/contracts", request.url), 303)
}
