import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export async function nextInvoiceNumber(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const latest = await prisma.invoice.findFirst({
      orderBy: { number: "desc" },
      select: { number: true },
    })
    const num = latest ? (parseInt(latest.number.replace(/\D/g, "")) || 0) + 1 : 1
    const next = `INV-${String(num).padStart(4, "0")}`

    const existing = await prisma.invoice.findUnique({ where: { number: next } })
    if (!existing) return next
  }

  const fallback = await prisma.invoice.aggregate({ _max: { number: true } })
  const maxNum = fallback._max.number ? parseInt(fallback._max.number.replace(/\D/g, "")) || 0 + 1 : 1
  return `INV-${String(maxNum).padStart(4, "0")}`
}
