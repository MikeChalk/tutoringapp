import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getActiveCityId } from "@/lib/auth-helpers"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"
import { logActivity } from "@/lib/activity"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const description = (formData.get("description") as string)?.trim()
  const amount = parseFloat((formData.get("amount") as string) || "0")
  const category = (formData.get("category") as string) || "OTHER"
  const date = (formData.get("date") as string) || new Date().toISOString().split("T")[0]
  const projectId = (formData.get("projectId") as string)?.trim() || null
  const clientId = (formData.get("clientId") as string)?.trim() || null
  const cityId = await getActiveCityId(session.user.role, session.user.id)
  const file = formData.get("receipt") as File | null

  if (!description || !amount || !date) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  let receiptFileName: string | null = null
  if (file && file.size > 0) {
    const ext = file.name.split(".").pop() || "pdf"
    receiptFileName = `${crypto.randomBytes(8).toString("hex")}.${ext}`
    const uploadDir = path.join(process.cwd(), "uploads", "expenses")
    await mkdir(uploadDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadDir, receiptFileName), buffer)
  }

  await prisma.expense.create({
    data: {
      description,
      amount,
      category,
      date: new Date(date),
      cityId,
      clientId,
      receiptFileName,
    },
  })

  await logActivity(session.user.id, "created", "Expense", null, `$${amount.toFixed(2)} - ${description}`)

  return NextResponse.redirect(new URL("/dashboard/expenses", request.url), 303)
}
