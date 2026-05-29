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
  const type = formData.get("type") as string
  const file = formData.get("file") as File

  if (!file || !type) {
    return NextResponse.json({ error: "Missing file or type" }, { status: 400 })
  }

  const text = await file.text()
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 })
  }

  function parseRow(line: string): Record<string, string> {
    const result: Record<string, string> = {}
    const fields: string[] = []
    let current = ""
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === "," && !inQuotes) { fields.push(current.trim()); current = ""; continue }
      current += ch
    }
    fields.push(current.trim())
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase())
    headers.forEach((h, i) => { result[h] = fields[i] || "" })
    return result
  }

  const results = { created: 0, skipped: 0, errors: [] as string[] }

  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseRow(lines[i])

      if (type === "team") {
        const name = row.name?.trim()
        const email = row.email?.trim().toLowerCase()
        if (!name || !email) { results.errors.push(`Row ${i + 1}: name and email required`); results.skipped++; continue }

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) { results.errors.push(`Row ${i + 1}: ${email} already exists`); results.skipped++; continue }

        let cityId: string | null = null
        if (row.city) {
          const city = await prisma.city.findFirst({ where: { name: { contains: row.city } } })
          if (city) cityId = city.id
        }

        const tenure = ["1ST_YEAR", "2ND_YEAR", "3RD_YEAR"].includes(row.tenure?.toUpperCase() || "") ? row.tenure.toUpperCase() : "1ST_YEAR"
        const onboarded = (row.onboarded || "false").toLowerCase() === "true"
        const tempPassword = Math.random().toString(36).slice(2, 10)
        const hashed = await bcrypt.hash(tempPassword, 12)

        const user = await prisma.user.create({
          data: { name, email, password: hashed, role: "TUTOR", cityId },
        })
        await prisma.tutor.create({
          data: {
            userId: user.id,
            tenure,
            subjects: row.subjects || "",
            gradeLevels: row.grade_levels || "",
            isActive: true,
            onboarded,
            onboardedAt: onboarded ? new Date() : null,
          },
        })
        results.created++
      }

      if (type === "clients") {
        const name = row.name?.trim()
        const email = row.email?.trim().toLowerCase()
        if (!name || !email) { results.errors.push(`Row ${i + 1}: name and email required`); results.skipped++; continue }

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) { results.errors.push(`Row ${i + 1}: ${email} already exists`); results.skipped++; continue }

        let cityId: string | null = null
        if (row.city) {
          const city = await prisma.city.findFirst({ where: { name: { contains: row.city } } })
          if (city) cityId = city.id
        }

        const clientType = row.type?.toUpperCase() === "SCHOOL" ? "SCHOOL" : "PARENT"
        const tempPassword = Math.random().toString(36).slice(2, 10)
        const hashed = await bcrypt.hash(tempPassword, 12)

        const user = await prisma.user.create({
          data: { name, email, password: hashed, role: "CLIENT", cityId },
        })
        await prisma.client.create({
          data: {
            userId: user.id,
            type: clientType,
            company: row.company?.trim() || null,
            phone: row.phone?.trim() || null,
            address: row.address?.trim() || null,
          },
        })
        results.created++
      }

      if (type === "expenses") {
        const description = row.description?.trim()
        const amount = parseFloat(row.amount)
        if (!description || isNaN(amount)) { results.errors.push(`Row ${i + 1}: description and amount required`); results.skipped++; continue }

        let cityId: string | null = null
        if (row.city) {
          const city = await prisma.city.findFirst({ where: { name: { contains: row.city } } })
          if (city) cityId = city.id
        }

        await prisma.expense.create({
          data: {
            description,
            amount,
            category: row.category?.trim() || "OTHER",
            date: row.date ? new Date(row.date) : new Date(),
            cityId,
          },
        })
        results.created++
      }

      if (type === "invoices") {
        const clientEmail = row.client_email?.trim().toLowerCase()
        const description = row.description?.trim()
        const hours = parseFloat(row.hours) || 0
        const rate = parseFloat(row.rate) || 0
        const amount = parseFloat(row.amount) || hours * rate
        if (!clientEmail || !description) { results.errors.push(`Row ${i + 1}: client_email and description required`); results.skipped++; continue }

        const user = await prisma.user.findUnique({ where: { email: clientEmail } })
        const client = user ? await prisma.client.findUnique({ where: { userId: user.id } }) : null
        if (!client) { results.errors.push(`Row ${i + 1}: client ${clientEmail} not found`); results.skipped++; continue }

        const invoiceCount = await prisma.invoice.count()
        const number = `INV-${String(invoiceCount + 1).padStart(4, "0")}`
        const dueDate = row.due_date ? new Date(row.due_date) : new Date(Date.now() + 30 * 86400000)

        await prisma.invoice.create({
          data: {
            number,
            clientId: client.id,
            status: (row.status || "DRAFT").toUpperCase(),
            dueDate,
            totalAmount: amount,
            notes: description,
            items: {
              create: [{
                description,
                hours,
                rate,
                amount,
              }],
            },
          },
        })
        results.created++
      }
    } catch (e: any) {
      results.errors.push(`Row ${i + 1}: ${e.message}`)
      results.skipped++
    }
  }

  const searchParams = new URLSearchParams({
    created: String(results.created),
    skipped: String(results.skipped),
  })
  results.errors.slice(0, 5).forEach(e => searchParams.append("err", e))

  return NextResponse.redirect(
    new URL(`/dashboard/import?${searchParams.toString()}`, request.url),
    303
  )
}
