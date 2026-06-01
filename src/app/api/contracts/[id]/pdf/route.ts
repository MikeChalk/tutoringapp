import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateContractPDF } from "@/lib/contract-pdf"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      tutor: { include: { user: { select: { name: true, email: true } } } },
    },
  })

  if (!contract) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const settings = await prisma.companySettings.findUnique({ where: { id: "main" } })

  let rates: Record<string, { online?: number; inPerson?: number }> = {}
  try {
    rates = JSON.parse(contract.rates || "{}")
  } catch { /* ignore */ }

  const pdf = await generateContractPDF({
    tutorName: contract.tutor.user.name,
    tutorEmail: contract.tutor.user.email,
    contractType: contract.type,
    yearLevel: contract.yearLevel,
    startDate: contract.startDate,
    endDate: contract.endDate,
    terms: contract.terms,
    rates,
    signed: contract.signed,
    signedAt: contract.signedAt,
    signedByName: contract.signed ? contract.tutor.user.name : null,
    companyName: settings?.name || undefined,
    companyAddress: settings?.address || undefined,
    companyEmail: settings?.email || undefined,
    companyPhone: settings?.phone || undefined,
  })

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Contract-${contract.tutor.user.name.replace(/\s/g, "-")}.pdf"`,
    },
  })
}
