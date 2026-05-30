import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import { CONTRACT_TYPES, TENURE_VALUES } from "@/lib/constants"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const tutorId = formData.get("tutorId") as string
  const type = formData.get("type") as string
  const yearLevel = formData.get("yearLevel") as string
  const terms = formData.get("terms") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string

  if (!tutorId || !type || !yearLevel || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  if (!CONTRACT_TYPES.includes(type as typeof CONTRACT_TYPES[number])) {
    return NextResponse.json({ error: "Invalid contract type" }, { status: 400 })
  }
  if (!TENURE_VALUES.includes(yearLevel as typeof TENURE_VALUES[number])) {
    return NextResponse.json({ error: "Invalid year level" }, { status: 400 })
  }

  const payScales = await prisma.payScale.findMany({ where: { tenure: yearLevel } })
  const ratesMap: Record<string, number> = {}
  for (const ps of payScales) {
    ratesMap[ps.gradeLevel] = ps.rate
  }

  await prisma.$transaction([
    prisma.contract.updateMany({
      where: { tutorId, status: "ACTIVE" },
      data: { status: "EXPIRED" },
    }),
  ])

  await prisma.contract.create({
    data: {
      tutorId,
      type,
      yearLevel,
      terms: terms || `${type.replace(/_/g, " ")} contract — Year ${yearLevel === "1ST_YEAR" ? "1" : yearLevel === "2ND_YEAR" ? "2" : "3"}`,
      rates: JSON.stringify(ratesMap),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  })

  await prisma.tutor.update({
    where: { id: tutorId },
    data: { tenure: yearLevel },
  })

  return NextResponse.redirect(new URL("/dashboard/contracts", request.url), 303)
}
