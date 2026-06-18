import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export async function nextInvoiceNumber(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const all = await prisma.invoice.findMany({ select: { number: true } })
    const maxNum = all.reduce((m, i) => {
      const n = parseInt(i.number.replace(/\D/g, "")) || 0
      return n > m ? n : m
    }, 0)
    const next = `INV-${String(maxNum + 1).padStart(4, "0")}`

    const existing = await prisma.invoice.findUnique({ where: { number: next } })
    if (!existing) return next
  }

  return `INV-${Date.now()}`
}
