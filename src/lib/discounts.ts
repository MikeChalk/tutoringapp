import { prisma } from "@/lib/db"

export interface DiscountValidation {
  valid: boolean
  discountPct: number
  discountAmt: number
  error?: string
}

export async function validateDiscountCode(
  code: string,
  cycleId?: string,
): Promise<DiscountValidation> {
  const c = await prisma.discountCode.findUnique({ where: { code: code.toUpperCase() } })
  if (!c) return { valid: false, discountPct: 0, discountAmt: 0, error: "Invalid discount code" }
  // Scope to the cycle: if a cycleId is provided, the code must belong to that
  // cycle (cycleId null codes are global, e.g. legacy invoice discounts).
  if (cycleId !== undefined && c.cycleId !== null && c.cycleId !== cycleId) {
    return { valid: false, discountPct: 0, discountAmt: 0, error: "Invalid discount code" }
  }
  if (!c.isActive) return { valid: false, discountPct: 0, discountAmt: 0, error: "This discount code is no longer active" }
  // Enforce validity window
  const now = new Date()
  if (c.validFrom && now < c.validFrom) return { valid: false, discountPct: 0, discountAmt: 0, error: "This discount code is not yet active" }
  if (c.validUntil && now > c.validUntil) return { valid: false, discountPct: 0, discountAmt: 0, error: "This discount code has expired" }
  if (c.maxUses > 0 && c.usedCount >= c.maxUses) return { valid: false, discountPct: 0, discountAmt: 0, error: "This discount code has reached its usage limit" }
  return { valid: true, discountPct: c.discountPct, discountAmt: c.discountAmt }
}

export async function applyDiscountCode(
  code: string,
  cycleId?: string,
): Promise<DiscountValidation> {
  const result = await validateDiscountCode(code, cycleId)
  if (!result.valid) return result
  // Atomic conditional increment: only increment if under maxUses, preventing
  // concurrent requests from exceeding the limit (TOCTOU race).
  if (cycleId !== undefined) {
    const c = await prisma.discountCode.findUnique({ where: { code: code.toUpperCase() }, select: { maxUses: true } })
    if (c && c.maxUses > 0) {
      const updated = await prisma.discountCode.updateMany({
        where: { code: code.toUpperCase(), usedCount: { lt: c.maxUses } },
        data: { usedCount: { increment: 1 } },
      })
      if (updated.count === 0) return { valid: false, discountPct: 0, discountAmt: 0, error: "This discount code has reached its usage limit" }
    } else {
      await prisma.discountCode.update({ where: { code: code.toUpperCase() }, data: { usedCount: { increment: 1 } } })
    }
  } else {
    await prisma.discountCode.update({ where: { code: code.toUpperCase() }, data: { usedCount: { increment: 1 } } })
  }
  return result
}

/** Increment usedCount within a transaction using the provided tx client. */
export async function applyDiscountCodeTx(
  tx: Parameters<Parameters<typeof import("@/lib/db").prisma["$transaction"]>[0]>[0],
  code: string,
  cycleId?: string,
): Promise<DiscountValidation> {
  const upper = code.toUpperCase()
  const c = await tx.discountCode.findUnique({ where: { code: upper } })
  if (!c) return { valid: false, discountPct: 0, discountAmt: 0, error: "Invalid discount code" }
  if (cycleId !== undefined && c.cycleId !== null && c.cycleId !== cycleId) {
    return { valid: false, discountPct: 0, discountAmt: 0, error: "Invalid discount code" }
  }
  if (!c.isActive) return { valid: false, discountPct: 0, discountAmt: 0, error: "This discount code is no longer active" }
  const now = new Date()
  if (c.validFrom && now < c.validFrom) return { valid: false, discountPct: 0, discountAmt: 0, error: "This discount code is not yet active" }
  if (c.validUntil && now > c.validUntil) return { valid: false, discountPct: 0, discountAmt: 0, error: "This discount code has expired" }
  if (c.maxUses > 0 && c.usedCount >= c.maxUses) return { valid: false, discountPct: 0, discountAmt: 0, error: "This discount code has reached its usage limit" }
  if (c.maxUses > 0) {
    const updated = await tx.discountCode.updateMany({ where: { code: upper, usedCount: { lt: c.maxUses } }, data: { usedCount: { increment: 1 } } })
    if (updated.count === 0) return { valid: false, discountPct: 0, discountAmt: 0, error: "This discount code has reached its usage limit" }
  } else {
    await tx.discountCode.update({ where: { code: upper }, data: { usedCount: { increment: 1 } } })
  }
  return { valid: true, discountPct: c.discountPct, discountAmt: c.discountAmt }
}

export function calculateDiscount(subtotal: number, discountPct: number, discountAmt: number): number {
  // When both pct and amt are set, pct wins (server-authoritative). A single
  // code should not carry both; admins set one or the other.
  if (discountPct > 0) return Math.round(subtotal * (discountPct / 100) * 100) / 100
  if (discountAmt > 0) return Math.round(discountAmt * 100) / 100
  return 0
}
