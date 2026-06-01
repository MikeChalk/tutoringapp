import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const frequency = formData.get("frequency") as string
  const valid = ["manual", "weekly", "biweekly", "monthly"]
  if (!valid.includes(frequency)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 })
  }

  await prisma.companySettings.upsert({
    where: { id: "main" },
    update: { payoutFrequency: frequency },
    create: { id: "main", payoutFrequency: frequency },
  })

  return NextResponse.redirect(new URL("/dashboard/payments-admin", request.url), 303)
}
