import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getTutorId, getCityAccessScope, assertInScope } from "@/lib/auth-helpers"
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
      tutor: { include: { user: { select: { name: true, email: true, cityId: true } } } },
    },
  })

  if (!contract) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (isAdmin(session.user.role)) {
    const scope = await getCityAccessScope(session.user.role, session.user.id)
    const scopeError = assertInScope(contract.tutor.user.cityId, scope)
    if (scopeError) return scopeError
  } else {
    const tutorId = await getTutorId(session.user.id, session.user.email)
    if (!tutorId || contract.tutorId !== tutorId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

  const settings = await prisma.companySettings.findUnique({ where: { id: "main" } })

  let rates: Record<string, number> = {}
  try {
    rates = JSON.parse(contract.rates || "{}")
  } catch { /* ignore */ }

  try {
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
      signedByName: contract.signedByName || (contract.signed ? contract.tutor.user.name : null),
      companyName: settings?.name || undefined,
      companyAddress: settings?.address || undefined,
      companyEmail: settings?.email || undefined,
      companyPhone: settings?.phone || undefined,
    })

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Contract-${contract.tutor.user.name.replace(/\s/g, "-")}.pdf"`,
      },
    })
  } catch (err) {
    console.error("[contract-pdf] Generation failed:", err)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
