import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { rateLimitByIp } from "@/lib/rate-limit"
import { validateDiscountCode, applyDiscountCodeTx, calculateDiscount } from "@/lib/discounts"
import crypto from "crypto"
import bcrypt from "bcryptjs"

interface DayOption { id: string; label: string; sessionsCount: number; price: number }

const MAX_FIELD_LEN = 5000
function cap(s: string | null): string | null {
  if (!s) return null
  const t = s.trim()
  if (t.length > MAX_FIELD_LEN) return t.slice(0, MAX_FIELD_LEN)
  return t || null
}

class ValidationError extends Error {
  constructor(public status: number, public clientMessage: string) {
    super(clientMessage)
  }
}

// Compute the next invoice number using a tx-scoped client (atomic with the
// surrounding transaction). Retries on unique-constraint collision (P2002)
// up to a sane bound instead of falling back to a non-sequential number.
async function nextInvoiceNumberTx(tx: Parameters<Parameters<typeof prisma["$transaction"]>[0]>[0]): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const all = await tx.invoice.findMany({ select: { number: true } })
    const maxNum = all.reduce((m, i) => {
      const n = parseInt(i.number.replace(/\D/g, "")) || 0
      return n > m ? n : m
    }, 0)
    const candidate = `INV-${String(maxNum + 1).padStart(4, "0")}`
    if (!all.some(i => i.number === candidate)) return candidate
  }
  const stamp = `INV-${Date.now()}`
  return stamp
}

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

  // Enforce the registration window (M5). Admin-set open/close dates are
  // authoritative even when the cycle status has not yet been flipped.
  const now = new Date()
  if (cycle.registrationOpen && now < cycle.registrationOpen) {
    return NextResponse.json({ error: "Registration has not opened yet for this cycle" }, { status: 400 })
  }
  if (cycle.registrationClose && now > cycle.registrationClose) {
    return NextResponse.json({ error: "Registration is closed for this cycle" }, { status: 400 })
  }

  const formData = await request.formData()
  const parentName = (formData.get("parentName") as string)?.trim()
  const studentName = (formData.get("studentName") as string)?.trim()
  const parentEmail = (formData.get("parentEmail") as string)?.trim().toLowerCase().replace(/[\r\n]/g, "")
  const parentPhone = (formData.get("parentPhone") as string)?.trim()
  const grade = cap(formData.get("grade") as string)
  const firstLanguage = cap(formData.get("firstLanguage") as string)
  const childNotes = cap(formData.get("childNotes") as string)
  const referrerName = cap(formData.get("referrerName") as string)
  const discountCodeInput = (formData.get("discountCode") as string)?.trim() || null
  const termsSignature = cap(formData.get("termsSignature") as string)
  const photoReleaseRaw = formData.get("photoRelease") as string
  const photoRelease = photoReleaseRaw === "AGREED" || photoReleaseRaw === "NOT_AGREED" ? photoReleaseRaw : null
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

  // Pre-validate the discount code (read-only) so we can return a friendly
  // 400 without starting a transaction. The atomic usedCount increment
  // happens inside the transaction below (applyDiscountCodeTx).
  let discountPct = 0
  let discountAmount = 0
  let finalDiscountCode: string | null = null
  if (discountCodeInput) {
    const result = await validateDiscountCode(discountCodeInput, cycle.id)
    if (result.valid) {
      finalDiscountCode = discountCodeInput.toUpperCase()
      discountPct = result.discountPct
      discountAmount = calculateDiscount(subtotal, result.discountPct, result.discountAmt)
    } else {
      return NextResponse.json({ error: result.error || "Invalid discount code" }, { status: 400 })
    }
  }

  let preregDiscount = 0
  if (cycle.preregistrationDeadline && cycle.preregistrationDiscount > 0) {
    if (now <= cycle.preregistrationDeadline) {
      preregDiscount = cycle.preregistrationDiscount
    }
  }

  // Note: the promo-code discount is stored separately in `discountAmount`;
  // `preregDiscount` is its own field. The dashboard must not re-add them
  // (see M3 fix in dashboard/study-hall/[id]/page.tsx).
  const promoDiscount = discountAmount
  const totalDiscountAmount = Math.round((promoDiscount + preregDiscount) * 100) / 100
  const totalAmount = Math.max(0, Math.round((subtotal - totalDiscountAmount) * 100) / 100)

  const dayDescriptions = selectedDays.map(d => `${d.label}: $${d.price.toFixed(2)}`).join(", ")
  const invoiceNotes = `Study Hall: ${cycle.name}\nStudent: ${studentName}${grade ? ` (${grade})` : ""}\n${dayDescriptions}${preregDiscount > 0 ? `\nPre-registration discount: -$${preregDiscount.toFixed(2)}` : ""}${referrerName ? `\nReferred by: ${referrerName}` : ""}`

  // Wrap the billable side-effects in a single transaction so that discount
  // usage, user/client creation, invoice, and registration commit together.
  let registrationId: string
  let createdClientId: string | null = null
  let isNewUser = false
  try {
    registrationId = await prisma.$transaction(async (tx) => {
      // Atomic conditional increment of usedCount, scoped to this cycle.
      if (discountCodeInput && finalDiscountCode) {
        const r = await applyDiscountCodeTx(tx, discountCodeInput, cycle.id)
        if (!r.valid) {
          throw new ValidationError(400, r.error || "This discount code is no longer available")
        }
      }

      // Find-or-create the parent user + client, handling the unique-email
      // race (concurrent registrations with the same email).
      let existingUser = await tx.user.findUnique({ where: { email: parentEmail }, include: { client: true } })
      let client = existingUser?.client || null
      if (!existingUser) {
        // Placeholder password is a bcrypt hash of a random secret that is
        // never communicated to the parent. They set their own password via
        // the signupToken invite link (/invite/<token>), delivered when the
        // admin confirms the registration. No temp password is stored in a
        // recoverable form.
        const signupToken = crypto.randomBytes(16).toString("hex")
        const placeholderHash = await bcryptPlaceholder()
        try {
          const newUser = await tx.user.create({
            data: {
              name: parentName,
              email: parentEmail,
              password: placeholderHash,
              role: "CLIENT",
              cityId: cycle.cityId,
              signupToken,
            },
          })
          client = await tx.client.create({ data: { userId: newUser.id, type: "PARENT", phone: parentPhone } })
          isNewUser = true
          createdClientId = client!.id
        } catch (e) {
          // P2002: a concurrent request created this email first.
          if (isUniqueViolation(e)) {
            existingUser = await tx.user.findUnique({ where: { email: parentEmail }, include: { client: true } })
            client = existingUser?.client || null
          } else {
            throw e
          }
        }
      }
      if (!client) {
        // User exists but has no Client row (e.g. a TUTOR email). Create one.
        client = await tx.client.create({ data: { userId: existingUser!.id, type: "PARENT", phone: parentPhone } })
        createdClientId = client.id
      }

      // Invoice number with retry on unique collision.
      const number = await nextInvoiceNumberTx(tx)
      const dueDate = new Date(cycle.startDate)
      const invoice = await tx.invoice.create({
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
          discountAmount: promoDiscount,
          status: "DRAFT",
          notes: invoiceNotes,
          items: {
            create: selectedDays.map(d => ({
              description: `${d.label} — ${studentName}`,
              hours: d.sessionsCount,
              rate: d.sessionsCount > 0 ? d.price / d.sessionsCount : d.price,
              amount: d.price,
            })),
          },
        },
      })

      const registration = await tx.registration.create({
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
          discountAmount: promoDiscount,
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
      return registration.id
    }, { timeout: 15000 })
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: e.clientMessage }, { status: e.status })
    }
    if (isUniqueViolation(e)) {
      // Likely invoice-number or another race; ask the client to retry.
      return NextResponse.json({ error: "A concurrent registration occurred. Please try again." }, { status: 409 })
    }
    throw e
  }

  // Email is a side-effect outside the transaction so a delivery failure
  // cannot roll back the persisted registration.
  if (isNewUser && createdClientId) {
    // Best-effort: deliver a set-password invite so the parent can access
    // their account. Admin-driven confirmation also sends the invoice email.
    const inviteToken = crypto.randomBytes(16).toString("hex")
    try {
      await prisma.user.update({ where: { email: parentEmail }, data: { signupToken: inviteToken } })
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
      const inviteUrl = `${baseUrl}/invite/${inviteToken}`
      const { sendClientInviteEmail } = await import("@/lib/email")
      await sendClientInviteEmail(parentEmail, parentName, inviteUrl, "client_invite")
    } catch (e) {
      // Log but do not surface: the registration itself succeeded.
      console.error("[study-hall/register] failed to send invite email:", e instanceof Error ? e.message : e)
    }
  }

  try {
    const settings = await prisma.companySettings.findUnique({ where: { id: "main" }, select: { emailEnabled: true } })
    if (settings?.emailEnabled !== false) {
      const { sendEmail, hasEmailTransport } = await import("@/lib/email")
      if (await hasEmailTransport()) {
        await sendEmail({
          from: "J.A.S.S. Tutors <info@jasstutors.com>",
          to: parentEmail,
          subject: `Registration Received — ${cycle.name}`,
          html: `<p>Hi ${parentName},</p><p>Thank you for registering ${studentName} for <strong>${cycle.name}</strong>.</p><p>We've received your registration and will confirm your spot by email shortly. Once confirmed, you'll receive an invoice with a link to pay online.</p><p>If you have any questions, please contact us at info@jasstutors.com.</p><p>— J.A.S.S. Tutors</p>`,
        })
      }
    }
  } catch (e) {
    console.error("[study-hall/register] failed to send registration confirmation email:", e instanceof Error ? e.message : e)
  }

  return NextResponse.json({ success: true, registrationId })
}

// Detect a Prisma unique-constraint violation across Prisma versions.
function isUniqueViolation(e: unknown): boolean {
  const anyErr = e as { code?: string; name?: string }
  return anyErr?.code === "P2002" || (anyErr?.name === "PrismaClientKnownRequestError" && anyErr?.code === "P2002")
}

// Generate an unusable placeholder password hash (random bytes we discard).
async function bcryptPlaceholder(): Promise<string> {
  const random = crypto.randomBytes(32).toString("hex")
  return bcrypt.hash(random, 12)
}