import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gradeLevel = searchParams.get("gradeLevel")
  const mode = searchParams.get("mode")
  const tenure = searchParams.get("tenure")

  const [billingRate, payScale] = await Promise.all([
    gradeLevel && mode
      ? prisma.billingRate.findFirst({ where: { gradeLevel, mode } })
      : null,
    tenure && gradeLevel && mode
      ? prisma.payScale.findFirst({ where: { tenure, gradeLevel, mode } })
      : null,
  ])

  return NextResponse.json({
    billingRate: billingRate?.rate ?? null,
    payRate: payScale?.rate ?? null,
  })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const type = formData.get("type") as string

  if (type === "city") {
    const name = (formData.get("name") as string)?.trim()
    const slug = (formData.get("slug") as string)?.trim().toLowerCase()
    const profitPct = parseFloat((formData.get("profitPct") as string) || "30")
    if (!name || !slug) return NextResponse.json({ error: "Name and slug required" }, { status: 400 })
    await prisma.city.create({ data: { name, slug, profitPct } })
  } else if (type === "billing") {
    const gradeLevel = formData.get("gradeLevel") as string
    const mode = formData.get("mode") as string
    const projectType = (formData.get("projectType") as string) || "STUDENT"
    const rate = parseFloat(formData.get("rate") as string)
    if (!gradeLevel || !mode || isNaN(rate)) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    await prisma.billingRate.create({ data: { gradeLevel, mode, projectType, rate } })
  } else if (type === "payscale") {
    const tenure = formData.get("tenure") as string
    const gradeLevel = formData.get("gradeLevel") as string
    const mode = formData.get("mode") as string
    const projectType = (formData.get("projectType") as string) || "STUDENT"
    const rate = parseFloat(formData.get("rate") as string)
    if (!tenure || !gradeLevel || !mode || isNaN(rate)) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    await prisma.payScale.create({ data: { tenure, gradeLevel, mode, projectType, rate } })
  } else if (type === "deleteBilling") {
    const id = formData.get("id") as string
    if (id) await prisma.billingRate.delete({ where: { id } })
  } else if (type === "deletePayScale") {
    const id = formData.get("id") as string
    if (id) await prisma.payScale.delete({ where: { id } })
  }

  return NextResponse.redirect(new URL(`/dashboard/rates?tab=${type.startsWith("delete") ? (type === "deleteBilling" ? "billing" : "payscales") : type === "city" ? "cities" : type === "billing" ? "billing" : "payscales"}`, request.url), 303)
}
