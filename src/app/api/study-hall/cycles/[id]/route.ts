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

  const cycle = await prisma.studyHallCycle.findUnique({ where: { id }, select: { cityId: true, schoolClientId: true, slug: true } })
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 })

  const scopeError = assertInScope(cycle.cityId, scope)
  if (scopeError) return scopeError

  const formData = await request.formData()
  const action = formData.get("_action") as string

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
        earlyBirdPct: earlyBirdEnabled ? earlyBirdPct : 0,
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
            discountPct: earlyBirdPct,
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
            discountPct: earlyBirdPct,
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

    const fullCycle = await prisma.studyHallCycle.findUnique({ where: { id }, select: { name: true, pricePerSession: true } })
    const number = await nextInvoiceNumber()
    const dueDate = new Date(Date.now() + 30 * 86400000)

    const invoice = await prisma.invoice.create({
      data: {
        number,
        clientId: cycle.schoolClientId,
        dueDate,
        totalAmount: 0,
        status: "DRAFT",
        notes: `Study Hall: ${fullCycle?.name || id}`,
      },
    })

    await logActivity(session.user.id, "created", "Invoice", number, `Lump-sum for cycle ${id}`)
    return NextResponse.redirect(new URL(`/dashboard/invoices/${invoice.id}`, request.url), 303)
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
