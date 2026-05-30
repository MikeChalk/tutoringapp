import { prisma } from "@/lib/db"

export interface DiscountValidation {
  valid: boolean
  discountPct: number
  discountAmt: number
  error?: string
}

export async function validateDiscountCode(code: string): Promise<DiscountValidation> {
  const c = await prisma.discountCode.findUnique({ where: { code: code.toUpperCase() } })
  if (!c) return { valid: false, discountPct: 0, discountAmt: 0, error: "Invalid discount code" }
  if (!c.isActive) return { valid: false, discountPct: 0, discountAmt: 0, error: "This discount code is no longer active" }
  if (c.maxUses > 0 && c.usedCount >= c.maxUses) return { valid: false, discountPct: 0, discountAmt: 0, error: "This discount code has reached its usage limit" }
  return { valid: true, discountPct: c.discountPct, discountAmt: c.discountAmt }
}

export async function applyDiscountCode(code: string): Promise<DiscountValidation> {
  const result = await validateDiscountCode(code)
  if (!result.valid) return result
  await prisma.discountCode.update({
    where: { code: code.toUpperCase() },
    data: { usedCount: { increment: 1 } },
  })
  return result
}

export function calculateDiscount(subtotal: number, discountPct: number, discountAmt: number): number {
  if (discountPct > 0) return subtotal * (discountPct / 100)
  if (discountAmt > 0) return discountAmt
  return 0
}
