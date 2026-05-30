import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export async function nextInvoiceNumber(): Promise<string> {
  const latest = await prisma.invoice.findFirst({
    orderBy: { number: "desc" },
    select: { number: true },
  })
  if (!latest) return "INV-0001"

  const num = parseInt(latest.number.replace(/\D/g, "")) || 0
  return `INV-${String(num + 1).padStart(4, "0")}`
}
