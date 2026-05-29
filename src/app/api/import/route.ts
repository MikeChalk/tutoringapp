import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import bcrypt from "bcryptjs"

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  function parseLine(line: string): string[] {
    const fields: string[] = []
    let current = ""
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === "," && !inQuotes) { fields.push(current.trim()); current = ""; continue }
      current += ch
    }
    fields.push(current.trim())
    return fields
  }

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase())
  const rows = lines.slice(1).map(line => {
    const values = parseLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = values[i] || "" })
    return obj
  })

  return { headers, rows }
}

export async function GET(request: Request) {
  return NextResponse.json({ error: "Use POST" }, { status: 405 })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const type = formData.get("type") as string
  const action = (formData.get("_action") as string) || "import"

  if (action === "preview") {
    return handlePreview(formData, type)
  }

  return handleImport(formData, type, request)
}

async function handlePreview(formData: FormData, type: string) {
  const file = formData.get("file") as File
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

  const text = await file.text()
  const { rows } = parseCSV(text)
  if (rows.length === 0) return NextResponse.json({ error: "No data rows found" }, { status: 400 })

  const cities = await prisma.city.findMany({ select: { id: true, name: true } })
  const preview = await Promise.all(rows.map(async (row, i) => {
    const issues: string[] = []
    const resolved: Record<string, string> = {}

    if (type === "team") {
      if (!row.name?.trim()) issues.push("Missing name")
      else resolved.name = row.name.trim()
      if (!row.email?.trim()) issues.push("Missing email")
      else {
        resolved.email = row.email.trim().toLowerCase()
        const exists = await prisma.user.findUnique({ where: { email: resolved.email } })
        if (exists) issues.push("Email already exists")
      }
      resolved.tenure = ["1ST_YEAR", "2ND_YEAR", "3RD_YEAR"].includes(row.tenure?.toUpperCase() || "") ? row.tenure!.toUpperCase() : "1ST_YEAR"
      resolved.subjects = row.subjects || ""
      resolved.grades = row.grade_levels || ""
      resolved.onboarded = (row.onboarded || "").toLowerCase() === "true" ? "Active" : "Waitlist"
      if (row.city) {
        const match = cities.find(c => c.name.toLowerCase() === row.city.toLowerCase()) || cities.find(c => c.name.toLowerCase().includes(row.city.toLowerCase()))
        resolved.city = match?.name || `${row.city} (not found)`
        if (!match) issues.push(`City "${row.city}" not found`)
      }
    }

    if (type === "clients") {
      if (!row.name?.trim()) issues.push("Missing name")
      else resolved.name = row.name.trim()
      if (!row.email?.trim()) issues.push("Missing email")
      else {
        resolved.email = row.email.trim().toLowerCase()
        const exists = await prisma.user.findUnique({ where: { email: resolved.email } })
        if (exists) issues.push("Email already exists")
      }
      resolved.type = row.type?.toUpperCase() === "SCHOOL" ? "School" : "Parent"
      resolved.company = row.company?.trim() || "-"
      resolved.phone = row.phone || "-"
      if (row.city) {
        const match = cities.find(c => c.name.toLowerCase() === row.city.toLowerCase()) || cities.find(c => c.name.toLowerCase().includes(row.city.toLowerCase()))
        resolved.city = match?.name || `${row.city} (not found)`
        if (!match) issues.push(`City "${row.city}" not found`)
      }
    }

    if (type === "expenses") {
      if (!row.description?.trim()) issues.push("Missing description")
      else resolved.description = row.description.trim()
      if (!row.amount || isNaN(parseFloat(row.amount))) issues.push("Missing amount")
      else resolved.amount = `$${parseFloat(row.amount).toFixed(2)}`
      resolved.category = row.category || "OTHER"
      resolved.date = row.date || new Date().toISOString().split("T")[0]
      if (row.city) {
        const match = cities.find(c => c.name.toLowerCase() === row.city.toLowerCase()) || cities.find(c => c.name.toLowerCase().includes(row.city.toLowerCase()))
        resolved.city = match?.name || `${row.city} (not found)`
        if (!match) issues.push(`City "${row.city}" not found`)
      }
    }

    if (type === "invoices") {
      if (!row.client_email?.trim()) issues.push("Missing client email")
      else {
        resolved.clientEmail = row.client_email.trim().toLowerCase()
        const user = await prisma.user.findUnique({ where: { email: resolved.clientEmail } })
        const client = user ? await prisma.client.findUnique({ where: { userId: user.id } }) : null
        if (!client) issues.push(`Client "${resolved.clientEmail}" not found`)
        else resolved.clientName = user!.name
      }
      if (!row.description?.trim()) issues.push("Missing description")
      else resolved.description = row.description.trim()
      resolved.hours = row.hours || "0"
      resolved.rate = row.rate || "0"
      resolved.amount = row.amount || (parseFloat(row.hours || "0") * parseFloat(row.rate || "0")).toFixed(2)
      resolved.status = (row.status || "DRAFT").toUpperCase()
      resolved.dueDate = row.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
    }

    return { row: i + 1, issues, resolved, canImport: issues.length === 0 }
  }))

  return NextResponse.json({ preview, rowCount: rows.length })
}

async function handleImport(formData: FormData, type: string, request: Request) {
  const file = formData.get("file") as File
  const fileContent = formData.get("fileContent") as string
  const rowsJson = formData.get("rows") as string

  let text: string
  if (file && file.size > 0) {
    text = await file.text()
  } else if (fileContent) {
    text = fileContent
  } else {
    return NextResponse.json({ error: "No file data" }, { status: 400 })
  }
  const { rows: allRows } = parseCSV(text)
  const selectedIndices = rowsJson ? JSON.parse(rowsJson) as number[] : allRows.map((_, i) => i)
  const rows = selectedIndices.map(i => allRows[i]).filter(Boolean)

  if (rows.length === 0) return NextResponse.json({ error: "No rows selected" }, { status: 400 })

  const cities = await prisma.city.findMany({ select: { id: true, name: true } })
  const results = { created: 0, skipped: 0, errors: [] as string[] }

  for (const row of rows) {
    try {
      if (type === "team") {
        const name = row.name?.trim()
        const email = row.email?.trim().toLowerCase()
        if (!name || !email) { results.errors.push(`Row: name and email required`); results.skipped++; continue }

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) { results.errors.push(`${email} already exists`); results.skipped++; continue }

        let cityId: string | null = null
        if (row.city) {
          const match = cities.find(c => c.name.toLowerCase() === row.city.toLowerCase()) || cities.find(c => c.name.toLowerCase().includes(row.city.toLowerCase()))
          if (match) cityId = match.id
        }

        const tenure = ["1ST_YEAR", "2ND_YEAR", "3RD_YEAR"].includes(row.tenure?.toUpperCase() || "") ? row.tenure!.toUpperCase() : "1ST_YEAR"
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

      else if (type === "clients") {
        const name = row.name?.trim()
        const email = row.email?.trim().toLowerCase()
        if (!name || !email) { results.errors.push(`Row: name and email required`); results.skipped++; continue }

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) { results.errors.push(`${email} already exists`); results.skipped++; continue }

        let cityId: string | null = null
        if (row.city) {
          const match = cities.find(c => c.name.toLowerCase() === row.city.toLowerCase()) || cities.find(c => c.name.toLowerCase().includes(row.city.toLowerCase()))
          if (match) cityId = match.id
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

      else if (type === "expenses") {
        const description = row.description?.trim()
        const amount = parseFloat(row.amount)
        if (!description || isNaN(amount)) { results.errors.push(`Row: description and amount required`); results.skipped++; continue }

        let cityId: string | null = null
        if (row.city) {
          const match = cities.find(c => c.name.toLowerCase() === row.city.toLowerCase()) || cities.find(c => c.name.toLowerCase().includes(row.city.toLowerCase()))
          if (match) cityId = match.id
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

      else if (type === "invoices") {
        const clientEmail = row.client_email?.trim().toLowerCase()
        const description = row.description?.trim()
        const hours = parseFloat(row.hours) || 0
        const rate = parseFloat(row.rate) || 0
        const amount = parseFloat(row.amount) || hours * rate
        if (!clientEmail || !description) { results.errors.push(`Row: client_email and description required`); results.skipped++; continue }

        const user = await prisma.user.findUnique({ where: { email: clientEmail } })
        const client = user ? await prisma.client.findUnique({ where: { userId: user.id } }) : null
        if (!client) { results.errors.push(`Client ${clientEmail} not found`); results.skipped++; continue }

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
    } catch {
      results.errors.push(`Row failed: could not create record`)
      results.skipped++
    }
  }

  const searchParams = new URLSearchParams({
    created: String(results.created),
    skipped: String(results.skipped),
  })
  results.errors.slice(0, 10).forEach(e => searchParams.append("err", e))

  return NextResponse.redirect(
    new URL(`/dashboard/import?tab=${type}&${searchParams.toString()}`, request.url),
    303
  )
}
