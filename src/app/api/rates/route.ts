import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gradeLevel = searchParams.get("gradeLevel")
  const mode = searchParams.get("mode")
  const tenure = searchParams.get("tenure")

  const [billingRate, payScale] = await Promise.all([
    gradeLevel && mode
      ? prisma.billingRate.findFirst({ where: { gradeLevel, mode } })
      : null,
    tenure && gradeLevel && mode
      ? prisma.payScale.findFirst({ where: { tenure, gradeLevel, mode } })
      : null,
  ])

  return NextResponse.json({
    billingRate: billingRate?.rate ?? null,
    payRate: payScale?.rate ?? null,
  })
}
