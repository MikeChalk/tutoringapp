import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getActiveCityId } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const description = formData.get("description") as string
  const amount = parseFloat(formData.get("amount") as string)
  const category = formData.get("category") as string
  const date = formData.get("date") as string
  const cityId = await getActiveCityId(session.user.role, session.user.id)

  if (!description || !amount || !date) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  await prisma.expense.create({
    data: {
      description,
      amount,
      category: category || "OTHER",
      date: new Date(date),
      cityId,
    },
  })

  return NextResponse.redirect(new URL("/dashboard/expenses", request.url), 303)
}
