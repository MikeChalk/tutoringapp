import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const cycle = await prisma.studyHallCycle.findUnique({
    where: { slug },
    select: {
      id: true, name: true, billingModel: true, pricePerSession: true,
      dayOptions: true, gradeOptions: true, formConfig: true,
      introText: true, scheduleText: true, pricingText: true,
      termsText: true, photoReleaseText: true,
      preregistrationDeadline: true, preregistrationDiscount: true,
      earlyBirdEnabled: true, earlyBirdPct: true, earlyBirdDeadline: true,
      startDate: true, endDate: true, status: true,
    },
  })

  if (!cycle || cycle.status !== "OPEN") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let dayOptions: Array<{ id: string; label: string; sessionsCount: number; price: number }> = []
  let gradeOptions: string[] = []
  let formConfig: Record<string, boolean> = {}
  try { dayOptions = JSON.parse(cycle.dayOptions) } catch { /* */ }
  try { gradeOptions = JSON.parse(cycle.gradeOptions) } catch { /* */ }
  try { formConfig = JSON.parse(cycle.formConfig) } catch { /* */ }

  const now = new Date()
  const activeDiscountExists = await prisma.discountCode.findFirst({
    where: {
      isActive: true,
      cycleId: cycle.id,
      AND: [
        { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
        { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
      ],
    },
    select: { id: true },
  })

  return NextResponse.json({
    cycle: {
      ...cycle,
      dayOptions,
      gradeOptions,
      formConfig,
      preregistrationDeadline: cycle.preregistrationDeadline?.toISOString() || null,
      earlyBirdDeadline: cycle.earlyBirdDeadline?.toISOString() || null,
      startDate: cycle.startDate.toISOString(),
      endDate: cycle.endDate.toISOString(),
      // Do not surface actual discount code strings; only confirm existence.
      // The client validates a user-typed code via the POST registration.
    },
    discountCodesAvailable: !!activeDiscountExists,
  })
}
