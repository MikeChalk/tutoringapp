import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma, nextInvoiceNumber } from "@/lib/db"
import { isAdmin, getCityAccessScope, assertInScope } from "@/lib/auth-helpers"
import { logActivity } from "@/lib/activity"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return NextResponse.json({ error: "No city access" }, { status: 403 })

  const { id } = await params

  const cycle = await prisma.studyHallCycle.findUnique({ where: { id }, select: { cityId: true, schoolClientId: true, slug: true, billingModel: true } })
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })

  const scopeError = assertInScope(cycle.cityId, scope)
  if (scopeError) return scopeError

  const formData = await request.formData()
  const action = formData.get("_action") as string

  // Import the allowed billing models for validation.
  const { STUDY_HALL_BILLING_MODELS } = await import("@/lib/constants")

  if (action === "update") {
    const name = (formData.get("name") as string)?.trim()
    const yearLabel = (formData.get("yearLabel") as string)?.trim() || ""
    const cycleNumber = parseInt((formData.get("cycleNumber") as string) || "1") || 1
    const projectId = (formData.get("projectId") as string) || null
    const billingModel = (formData.get("billingModel") as string) || "INDIVIDUAL"
    const startDate = formData.get("startDate") as string
    const endDate = formData.get("endDate") as string
    const pricePerSession = parseFloat((formData.get("pricePerSession") as string) || "0") || 0
    const registrationOpen = formData.get("registrationOpen") as string
    const registrationClose = formData.get("registrationClose") as string
    const preregistrationDeadline = formData.get("preregistrationDeadline") as string
    const preregistrationDiscount = Math.round(parseFloat((formData.get("preregistrationDiscount") as string) || "0") || 0)
    const earlyBirdEnabled = formData.get("earlyBirdEnabled") === "true"
    const earlyBirdPct = parseFloat((formData.get("earlyBirdPct") as string) || "0") || 0
    const earlyBirdDeadline = formData.get("earlyBirdDeadline") as string
    const introText = formData.get("introText") as string
    const scheduleText = formData.get("scheduleText") as string
    const pricingText = formData.get("pricingText") as string
    const termsText = formData.get("termsText") as string
    const photoReleaseText = formData.get("photoReleaseText") as string
    const dayOptionsJson = formData.get("dayOptions") as string
    const gradeOptionsJson = formData.get("gradeOptions") as string
    const formConfigJson = formData.get("formConfig") as string

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // M4: validate numeric inputs and the billing model.
    if (!STUDY_HALL_BILLING_MODELS.includes(billingModel as typeof STUDY_HALL_BILLING_MODELS[number])) {
      return NextResponse.json({ error: "Invalid billing model" }, { status: 400 })
    }
    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json({ error: "End date must be on or after the start date" }, { status: 400 })
    }
    if (pricePerSession < 0) {
      return NextResponse.json({ error: "Price per session cannot be negative" }, { status: 400 })
    }
    if (preregistrationDiscount < 0) {
      return NextResponse.json({ error: "Pre-registration discount cannot be negative" }, { status: 400 })
    }
    const clampedEarlyBirdPct = Math.min(100, Math.max(0, earlyBirdPct))

    // L3: do not allow changing the billing model once registrations exist;
    // existing rows would be left orphaned with a mismatched lifecycle.
    if (billingModel !== cycle.billingModel) {
      const regCount = await prisma.registration.count({ where: { cycleId: id } })
      if (regCount > 0) {
        return NextResponse.json({ error: "Cannot change the billing model once registrations exist for this cycle" }, { status: 400 })
      }
    }

    let dayOptions = "[]"
    let gradeOptions = "[]"
    let formConfig = "{}"
    try { dayOptions = JSON.stringify(JSON.parse(dayOptionsJson || "[]")) } catch { /* */ }
    try { gradeOptions = JSON.stringify(JSON.parse(gradeOptionsJson || "[]")) } catch { /* */ }
    try { formConfig = JSON.stringify(JSON.parse(formConfigJson || "{}")) } catch { /* */ }

    await prisma.studyHallCycle.update({
      where: { id },
      data: {
        name,
        yearLabel,
        cycleNumber,
        projectId: projectId || null,
        billingModel,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        pricePerSession,
        registrationOpen: registrationOpen ? new Date(registrationOpen) : null,
        registrationClose: registrationClose ? new Date(registrationClose) : null,
        preregistrationDeadline: preregistrationDeadline ? new Date(preregistrationDeadline) : null,
        preregistrationDiscount,
        earlyBirdEnabled,
        earlyBirdPct: earlyBirdEnabled ? clampedEarlyBirdPct : 0,
        earlyBirdDeadline: earlyBirdEnabled && earlyBirdDeadline ? new Date(earlyBirdDeadline) : null,
        introText: introText || "",
        scheduleText: scheduleText || "",
        pricingText: pricingText || "",
        termsText: termsText || "",
        photoReleaseText: photoReleaseText || "",
        dayOptions,
        gradeOptions,
        formConfig,
      },
    })

    if (earlyBirdEnabled && earlyBirdPct > 0 && earlyBirdDeadline) {
      const existingCycleCode = await prisma.discountCode.findFirst({ where: { cycleId: id, code: { startsWith: "EARLYBIRD" } } })
      if (existingCycleCode) {
        await prisma.discountCode.update({
          where: { id: existingCycleCode.id },
          data: {
            discountPct: clampedEarlyBirdPct,
            validFrom: new Date(),
            validUntil: new Date(earlyBirdDeadline),
            isActive: true,
            cycleId: id,
          },
        })
      } else {
        const allEarlyBirdCodes = await prisma.discountCode.findMany({ where: { code: { startsWith: "EARLYBIRD" } } })
        const maxNum = allEarlyBirdCodes.reduce((max, c) => {
          const match = c.code.match(/^EARLYBIRD(\d+)$/)
          return match ? Math.max(max, parseInt(match[1])) : max
        }, 0)
        const earlyBirdCode = `EARLYBIRD${maxNum + 1}`
        await prisma.discountCode.create({
          data: {
            code: earlyBirdCode,
            description: `Early Bird — ${name}`,
            discountPct: clampedEarlyBirdPct,
            isActive: true,
            cycleId: id,
            validFrom: new Date(),
            validUntil: new Date(earlyBirdDeadline),
          },
        })
      }
    } else {
      const existingCodes = await prisma.discountCode.findMany({ where: { cycleId: id, code: { startsWith: "EARLYBIRD" } } })
      for (const code of existingCodes) {
        await prisma.discountCode.update({ where: { id: code.id }, data: { isActive: false } })
      }
    }

    return NextResponse.redirect(new URL(`/dashboard/study-hall/${id}`, request.url), 303)
  }

  if (action === "open") {
    await prisma.studyHallCycle.update({ where: { id }, data: { status: "OPEN" } })
    await logActivity(session.user.id, "opened", "StudyHallCycle", id)
    return NextResponse.redirect(new URL(`/dashboard/study-hall/${id}`, request.url), 303)
  }

  if (action === "close") {
    await prisma.studyHallCycle.update({ where: { id }, data: { status: "CLOSED" } })
    await logActivity(session.user.id, "closed", "StudyHallCycle", id)
    return NextResponse.redirect(new URL(`/dashboard/study-hall/${id}`, request.url), 303)
  }

  if (action === "lump-sum-invoice") {
    if (!cycle.schoolClientId) return NextResponse.json({ error: "No school client assigned" }, { status: 400 })
    if (cycle.billingModel !== "LUMP_SUM" && cycle.billingModel !== "LUMP_SUM_ROSTER") {
      return NextResponse.json({ error: "Lump-sum invoicing is only available for LUMP_SUM and LUMP_SUM_ROSTER billing models" }, { status: 400 })
    }

    const cycleMarker = `[cycle:${id}]`
    const existingInvoice = await prisma.invoice.findFirst({
      where: { notes: { contains: cycleMarker } },
      select: { id: true },
    })
    if (existingInvoice) {
      return NextResponse.json({ error: "An invoice already exists for this cycle" }, { status: 409 })
    }

    const fullCycle = await prisma.studyHallCycle.findUnique({
      where: { id },
      select: { name: true, pricePerSession: true },
    })

    const regs = await prisma.registration.findMany({
      where: { cycleId: id, status: "CONFIRMED" },
      select: { studentName: true, sessionsCount: true },
    })

    if (regs.length === 0) {
      return NextResponse.json({ error: "No confirmed registrations to invoice" }, { status: 400 })
    }

    const totalSessions = regs.reduce((sum, r) => sum + (r.sessionsCount || 0), 0)
    const pricePerSession = fullCycle?.pricePerSession || 0
    const lineAmount = Math.round(totalSessions * pricePerSession * 100) / 100

    const number = await nextInvoiceNumber()
    const dueDate = new Date(Date.now() + 30 * 86400000)

    const invoice = await prisma.invoice.create({
      data: {
        number,
        clientId: cycle.schoolClientId,
        dueDate,
        subtotal: lineAmount,
        totalAmount: lineAmount,
        status: "DRAFT",
        notes: `Study Hall: ${fullCycle?.name || id} ${cycleMarker}`,
        items: {
          create: {
            description: `${fullCycle?.name || "Study Hall"} — ${totalSessions} sessions (${regs.length} students)`,
            hours: totalSessions,
            rate: pricePerSession,
            amount: lineAmount,
          },
        },
      },
    })

    await logActivity(session.user.id, "created", "Invoice", number, `Lump-sum for cycle ${id}`)
    return NextResponse.redirect(new URL(`/dashboard/invoices/${invoice.id}`, request.url), 303)
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
