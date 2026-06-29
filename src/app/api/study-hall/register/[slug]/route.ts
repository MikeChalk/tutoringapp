import { NextResponse } from "next/server"
import { prisma, nextInvoiceNumber } from "@/lib/db"
import { rateLimitByIp } from "@/lib/rate-limit"
import { applyDiscountCode, calculateDiscount } from "@/lib/discounts"
import bcrypt from "bcryptjs"
import crypto from "crypto"

interface DayOption { id: string; label: string; sessionsCount: number; price: number }

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { allowed } = rateLimitByIp(request)
  if (!allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })

  const { slug } = await params

  const cycle = await prisma.studyHallCycle.findUnique({ where: { slug } })
  if (!cycle || cycle.status !== "OPEN") {
    return NextResponse.json({ error: "Registration is not open for this cycle" }, { status: 404 })
  }
  if (cycle.billingModel !== "INDIVIDUAL") {
    return NextResponse.json({ error: "This cycle does not accept individual registrations" }, { status: 400 })
  }

  const formData = await request.formData()
  const parentName = (formData.get("parentName") as string)?.trim()
  const studentName = (formData.get("studentName") as string)?.trim()
  const parentEmail = (formData.get("parentEmail") as string)?.trim().toLowerCase()
  const parentPhone = (formData.get("parentPhone") as string)?.trim()
  const grade = (formData.get("grade") as string)?.trim() || null
  const firstLanguage = (formData.get("firstLanguage") as string)?.trim() || null
  const childNotes = (formData.get("childNotes") as string)?.trim() || null
  const referrerName = (formData.get("referrerName") as string)?.trim() || null
  const discountCodeInput = (formData.get("discountCode") as string)?.trim() || null
  const termsSignature = (formData.get("termsSignature") as string)?.trim() || null
  const photoRelease = (formData.get("photoRelease") as string) || null
  const daySelectionsRaw = formData.get("daySelections") as string

  if (!parentName || !studentName || !parentEmail || !parentPhone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  let daySelections: string[] = []
  try { daySelections = JSON.parse(daySelectionsRaw || "[]") } catch {
    return NextResponse.json({ error: "Invalid day selections" }, { status: 400 })
  }

  if (daySelections.length === 0) {
    return NextResponse.json({ error: "Please select at least one day" }, { status: 400 })
  }

  let cycleDayOptions: DayOption[] = []
  try { cycleDayOptions = JSON.parse(cycle.dayOptions) } catch { /* */ }

  const selectedDays = cycleDayOptions.filter(d => daySelections.includes(d.id))
  if (selectedDays.length !== daySelections.length) {
    return NextResponse.json({ error: "Invalid day selection" }, { status: 400 })
  }

  const sessionsCount = selectedDays.reduce((s, d) => s + d.sessionsCount, 0)
  const subtotal = Math.round(selectedDays.reduce((s, d) => s + d.price, 0) * 100) / 100

  let discountPct = 0
  let discountAmount = 0
  let finalDiscountCode: string | null = null
  if (discountCodeInput) {
    const result = await applyDiscountCode(discountCodeInput)
    if (result.valid) {
      finalDiscountCode = discountCodeInput.toUpperCase()
      discountPct = result.discountPct
      discountAmount = calculateDiscount(subtotal, result.discountPct, result.discountAmt)
    }
  }

  let preregDiscount = 0
  if (cycle.preregistrationDeadline && cycle.preregistrationDiscount > 0) {
    if (new Date() <= new Date(cycle.preregistrationDeadline)) {
      preregDiscount = cycle.preregistrationDiscount
    }
  }

  const totalDiscountAmount = Math.round((discountAmount + preregDiscount) * 100) / 100
  const totalAmount = Math.max(0, Math.round((subtotal - totalDiscountAmount) * 100) / 100)

  let client = await (async () => {
    const user = await prisma.user.findUnique({ where: { email: parentEmail }, include: { client: true } })
    return user?.client || null
  })()

  if (!client) {
    const tempPassword = crypto.randomBytes(8).toString("hex")
    const hashed = await bcrypt.hash(tempPassword, 12)
    const signupToken = crypto.randomBytes(16).toString("hex")

    const newUser = await prisma.user.create({
      data: {
        name: parentName,
        email: parentEmail,
        password: hashed,
        role: "CLIENT",
        cityId: cycle.cityId,
        signupToken,
      },
    })
    client = await prisma.client.create({
      data: { userId: newUser.id, type: "PARENT", phone: parentPhone },
    })
  }

  const number = await nextInvoiceNumber()
  const dueDate = new Date(cycle.startDate)
  const dayDescriptions = selectedDays.map(d => `${d.label}: $${d.price.toFixed(2)}`).join(", ")
  const invoiceNotes = `Study Hall: ${cycle.name}\nStudent: ${studentName}${grade ? ` (${grade})` : ""}\n${dayDescriptions}${preregDiscount > 0 ? `\nPre-registration discount: -$${preregDiscount.toFixed(2)}` : ""}${referrerName ? `\nReferred by: ${referrerName}` : ""}`

  const invoice = await prisma.invoice.create({
    data: {
      number,
      clientId: client.id,
      dueDate,
      totalAmount,
      subtotal,
      taxRate: 0,
      taxAmount: 0,
      discountCode: finalDiscountCode,
      discountPct,
      discountAmount: totalDiscountAmount,
      status: "DRAFT",
      notes: invoiceNotes,
      items: {
        create: selectedDays.map(d => ({
          description: `${d.label} — ${studentName}`,
          hours: d.sessionsCount,
          rate: d.price / d.sessionsCount,
          amount: d.price,
        })),
      },
    },
  })

  const registration = await prisma.registration.create({
    data: {
      cycleId: cycle.id,
      studentName,
      grade,
      parentName,
      parentEmail,
      parentPhone,
      firstLanguage,
      daySelections: JSON.stringify(daySelections),
      sessionsCount,
      subtotal,
      childNotes,
      referrerName,
      discountCode: finalDiscountCode,
      discountPct,
      discountAmount,
      preregDiscount,
      totalAmount,
      termsAccepted: !!termsSignature,
      termsSignature,
      photoRelease,
      clientId: client.id,
      invoiceId: invoice.id,
      status: "PENDING",
    },
  })

  try {
    const settings = await prisma.companySettings.findUnique({ where: { id: "main" }, select: { emailEnabled: true } })
    if (settings?.emailEnabled !== false && process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend")
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: "J.A.S.S. Tutors <info@jasstutors.com>",
        to: parentEmail,
        subject: `Registration Received — ${cycle.name}`,
        html: `<p>Hi ${parentName},</p><p>Thank you for registering ${studentName} for <strong>${cycle.name}</strong>.</p><p>We've received your registration and will confirm your spot by email shortly. Once confirmed, you'll receive an invoice with a link to pay online.</p><p>If you have any questions, please contact us at info@jasstutors.com.</p><p>— J.A.S.S. Tutors</p>`,
      })
    }
  } catch { /* email failure should not block registration */ }

  return NextResponse.json({ success: true, registrationId: registration.id })
}
