import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, nextInvoiceNumber } from "@/lib/db"
import { isAdmin, getCityAccessScope } from "@/lib/auth-helpers"
import { GRADE_LABELS } from "@/lib/constants"
import crypto from "crypto"
import bcrypt from "bcryptjs"
function normalizeProjectType(val: string | undefined): string {
  const cleaned = (val || "").toUpperCase().replace(/[\s-]/g, "_")
  return cleaned === "STUDY_HALL" ? "STUDY_HALL" : "STUDENT"
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  function parseLine(line: string, delimiter: string): string[] {
    const fields: string[] = []
    let current = ""
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === delimiter && !inQuotes) { fields.push(current.trim()); current = ""; continue }
      current += ch
    }
    fields.push(current.trim())
    return fields
  }

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [] }

  // Auto-detect delimiter: tab or comma
  const firstLine = lines[0]
  const delimiter = firstLine.includes("\t") ? "\t" : ","

  const headers = parseLine(firstLine, delimiter).map(h => h.trim().toLowerCase())
  const rows = lines.slice(1).map(line => {
    const values = parseLine(line, delimiter)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = values[i] || "" })
    return obj
  })

  return { headers, rows }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return NextResponse.json({ error: "No city access" }, { status: 403 })
  const forcedCityId = scope.kind === "single" ? scope.cityId : null

  const formData = await request.formData()
  const type = formData.get("type") as string
  const action = (formData.get("_action") as string) || "import"

  if (action === "preview") {
    return handlePreview(formData, type)
  }

  return handleImport(formData, type, request, forcedCityId)
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
      const fullName = row.first_name ? (row.last_name ? `${row.first_name.trim()} ${row.last_name.trim()}` : row.first_name.trim()) : row.name?.trim()
      if (!fullName) issues.push("Missing name (use first_name+last_name or name)")
      else resolved.name = fullName
      if (!row.email?.trim()) issues.push("Missing email")
      else {
        resolved.email = row.email.trim().toLowerCase()
        const exists = await prisma.user.findUnique({ where: { email: resolved.email } })
        if (exists) issues.push("Email already exists")
      }
      resolved.tenure = ["1ST_YEAR", "2ND_YEAR", "3RD_YEAR"].includes(row.tenure?.toUpperCase() || "") ? row.tenure!.toUpperCase() : "1ST_YEAR"
      resolved.subjects = row.subjects || ""
      resolved.grades = row.grade_levels || ""
      resolved.role = ["TUTOR", "CITY_ADMIN"].includes(row.role?.toUpperCase() || "") ? row.role!.toUpperCase() : "TUTOR"
      resolved.status = "Onboarding (step 0)"
      resolved.phone = row.phone || "-"
      resolved.created = row.created_at || row.created_date || new Date().toISOString().split("T")[0]
      if (row.city) {
        const match = cities.find(c => c.name.toLowerCase() === row.city.toLowerCase()) || cities.find(c => c.name.toLowerCase().includes(row.city.toLowerCase()))
        resolved.city = match?.name || `${row.city} (not found)`
        if (!match) issues.push(`City "${row.city}" not found`)
      }
    }

    if (type === "clients") {
      const fullName = row.first_name ? (row.last_name ? `${row.first_name.trim()} ${row.last_name.trim()}` : row.first_name.trim()) : row.name?.trim()
      if (!fullName) issues.push("Missing name (use first_name+last_name or name)")
      else resolved.name = fullName
      if (!row.email?.trim()) issues.push("Missing email")
      else {
        resolved.email = row.email.trim().toLowerCase()
        const exists = await prisma.user.findUnique({ where: { email: resolved.email } })
        if (exists) issues.push("Email already exists")
      }
      resolved.type = row.type?.toUpperCase() === "SCHOOL" ? "School" : "Parent"
      resolved.company = row.company?.trim() || "-"
      resolved.phone = row.phone || "-"
      resolved.province = row.province || "-"
      resolved.country = row.country || "-"
      resolved.postal_code = row.postal_code || "-"
      resolved.notes = row.notes || "-"
      resolved.created = row.created_at || row.created_date || new Date().toISOString().split("T")[0]
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
      resolved.created = row.created_at || row.created_date || new Date().toISOString().split("T")[0]
    }

    if (type === "projects") {
      if (row.student_name?.trim()) resolved.studentName = row.student_name.trim()
      else resolved.studentName = "-"
      if (!row.client_email?.trim()) issues.push("Missing client email")
      else {
        resolved.clientEmail = row.client_email.trim().toLowerCase()
        const user = await prisma.user.findUnique({ where: { email: resolved.clientEmail } })
        if (!user || user.role !== "CLIENT") issues.push(`Client "${resolved.clientEmail}" not found`)
        else {
          resolved.clientName = user.name
          // Auto-generate project name: "StudentName - Grade (ParentName)" or "ProjectName (ParentName)" for study hall
          const gradeKey = row.grade_level || "ELEMENTARY"
          const projectType = normalizeProjectType(row.project_type)
          const student = row.student_name?.trim()
          // Naming priority: student_name > school (study hall) > description
          if (student) {
            if (projectType === "STUDY_HALL") {
              resolved.name = `${student} - Study Hall`
            } else {
              const gradeLabel = GRADE_LABELS[gradeKey] || gradeKey
              resolved.name = `${student} - ${gradeLabel} (${user.name})`
            }
          } else if (projectType === "STUDY_HALL" && row.school?.trim()) {
            resolved.name = `${row.school.trim()} - Study Hall`
          } else if (row.description?.trim()) {
            resolved.name = row.description.trim()
          } else {
            issues.push("Missing student_name, school, or description")
          }
        }
      }
      resolved.gradeLevel = row.grade_level || "ELEMENTARY"
      resolved.subjects = row.subjects || ""
      resolved.description = row.description || "-"
      resolved.projectType = normalizeProjectType(row.project_type)
      resolved.school = row.school || ""
      resolved.status = row.status || "ON_HOLD"
      resolved.created = row.created_at || row.created_date || new Date().toISOString().split("T")[0]
      if (row.city) {
        const match = cities.find(c => c.name.toLowerCase() === row.city.toLowerCase()) || cities.find(c => c.name.toLowerCase().includes(row.city.toLowerCase()))
        resolved.city = match?.name || `${row.city} (not found)`
        if (!match) issues.push(`City "${row.city}" not found`)
      }
    }

    return { row: i + 1, issues, resolved, canImport: issues.length === 0 }
  }))

  return NextResponse.json({ preview, rowCount: rows.length })
}

async function handleImport(formData: FormData, type: string, request: Request, forcedCityId: string | null) {
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
        const name = row.first_name ? (row.last_name ? `${row.first_name.trim()} ${row.last_name.trim()}` : row.first_name.trim()) : row.name?.trim()
        const email = row.email?.trim().toLowerCase()
        if (!name || !email) { results.errors.push(`Row: name and email required`); results.skipped++; continue }

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) { results.errors.push(`${email} already exists`); results.skipped++; continue }

        const cityId = forcedCityId
        const tenure = ["1ST_YEAR", "2ND_YEAR", "3RD_YEAR"].includes(row.tenure?.toUpperCase() || "") ? row.tenure!.toUpperCase() : "1ST_YEAR"
        const role = forcedCityId ? "TUTOR" : (["TUTOR", "CITY_ADMIN"].includes(row.role?.toUpperCase() || "") ? row.role!.toUpperCase() : "TUTOR")
        const tempPassword = crypto.randomBytes(8).toString("base64url").slice(0, 12)
        const hashed = await bcrypt.hash(tempPassword, 12)
        const createdDate = row.created_at || row.created_date

        const user = await prisma.user.create({
          data: {
            name, email, password: hashed, role, cityId,
            ...(createdDate && { createdAt: new Date(createdDate) }),
          },
        })
        await prisma.tutor.create({
          data: {
            userId: user.id,
            tenure,
            subjects: row.subjects || "",
            gradeLevels: row.grade_levels || "",
            phone: row.phone?.trim() || null,
            isActive: true,
            onboarded: false,
            onboardingStep: 0,
            ...(createdDate && { createdAt: new Date(createdDate) }),
          },
        })
        results.created++
      }

      else if (type === "clients") {
        const name = row.first_name ? (row.last_name ? `${row.first_name.trim()} ${row.last_name.trim()}` : row.first_name.trim()) : row.name?.trim()
        const email = row.email?.trim().toLowerCase()
        if (!name || !email) { results.errors.push(`Row: name and email required`); results.skipped++; continue }

        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) { results.errors.push(`${email} already exists`); results.skipped++; continue }

        const cityId = forcedCityId ?? (() => {
          if (row.city) {
            const match = cities.find(c => c.name.toLowerCase() === row.city.toLowerCase()) || cities.find(c => c.name.toLowerCase().includes(row.city.toLowerCase()))
            if (match) return match.id
          }
          return null
        })()

        const clientType = row.type?.toUpperCase() === "SCHOOL" ? "SCHOOL" : "PARENT"
        const tempPassword = crypto.randomBytes(8).toString("base64url").slice(0, 12)
        const hashed = await bcrypt.hash(tempPassword, 12)
        const createdDate = row.created_at || row.created_date

        const user = await prisma.user.create({
          data: {
            name, email, password: hashed, role: "CLIENT", cityId,
            ...(createdDate && { createdAt: new Date(createdDate) }),
          },
        })
        await prisma.client.create({
          data: {
            userId: user.id,
            type: clientType,
            company: row.company?.trim() || null,
            phone: row.phone?.trim() || null,
            address: row.address?.trim() || null,
            province: row.province?.trim() || null,
            country: row.country?.trim() || null,
            postalCode: row.postal_code?.trim() || null,
            notes: row.notes?.trim() || null,
            ...(createdDate && { createdAt: new Date(createdDate) }),
          },
        })
        results.created++
      }

      else if (type === "expenses") {
        const description = row.description?.trim()
        const amount = parseFloat(row.amount)
        if (!description || isNaN(amount)) { results.errors.push(`Row: description and amount required`); results.skipped++; continue }

        const cityId = forcedCityId ?? (() => {
          if (row.city) {
            const match = cities.find(c => c.name.toLowerCase() === row.city.toLowerCase()) || cities.find(c => c.name.toLowerCase().includes(row.city.toLowerCase()))
            if (match) return match.id
          }
          return null
        })()

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

        const number = await nextInvoiceNumber()
        const dueDate = row.due_date ? new Date(row.due_date) : new Date(Date.now() + 30 * 86400000)
        const createdDate = row.created_at || row.created_date
        const paidDate = row.status?.toUpperCase() === "PAID" && row.paid_date ? new Date(row.paid_date) : null

        await prisma.invoice.create({
          data: {
            number,
            clientId: client.id,
            status: (row.status || "DRAFT").toUpperCase(),
            dueDate,
            totalAmount: amount,
            notes: description,
            ...(createdDate && { createdAt: new Date(createdDate) }),
            ...(paidDate && { paidAt: paidDate }),
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

      else if (type === "projects") {
        const studentName = row.student_name?.trim()
        const clientEmail = row.client_email?.trim().toLowerCase()
        if (!studentName && !row.description?.trim()) { results.errors.push(`Row: student_name or description required`); results.skipped++; continue }
        if (!clientEmail) { results.errors.push(`Row: client_email required`); results.skipped++; continue }

        const user = await prisma.user.findUnique({ where: { email: clientEmail } })
        if (!user || user.role !== "CLIENT") { results.errors.push(`Client ${clientEmail} not found`); results.skipped++; continue }
        const client = await prisma.client.findUnique({ where: { userId: user.id } })
        if (!client) { results.errors.push(`Client record for ${clientEmail} not found`); results.skipped++; continue }

        const cityId = forcedCityId ?? (() => {
          if (row.city) {
            const match = cities.find(c => c.name.toLowerCase() === row.city.toLowerCase()) || cities.find(c => c.name.toLowerCase().includes(row.city.toLowerCase()))
            if (match) return match.id
          }
          return null
        })()

        const projectType = normalizeProjectType(row.project_type)
        const gradeLevel = row.grade_level || "ELEMENTARY"
        const name = (() => {
          if (studentName) {
            return projectType === "STUDY_HALL"
              ? `${studentName} - Study Hall`
              : `${studentName} - ${GRADE_LABELS[gradeLevel] || gradeLevel} (${user.name})`
          }
          if (projectType === "STUDY_HALL" && row.school?.trim()) {
            return `${row.school.trim()} - Study Hall`
          }
          return row.description?.trim() || `${studentName || "Project"} (${user.name})`
        })()
        const createdDate = row.created_at || row.created_date

        await prisma.project.create({
          data: {
            name,
            description: row.description?.trim() || null,
            clientId: client.id,
            gradeLevel,
            subjects: row.subjects || "",
            projectType,
            school: row.school?.trim() || "",
            status: row.status || "ON_HOLD",
            cityId,
            ...(createdDate && { createdAt: new Date(createdDate) }),
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
