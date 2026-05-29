import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const description = formData.get("description") as string
  const amount = parseFloat(formData.get("amount") as string)
  const category = formData.get("category") as string
  const date = formData.get("date") as string

  if (!description || !amount || !date) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  await prisma.expense.create({
    data: {
      description,
      amount,
      category: category || "OTHER",
      date: new Date(date),
    },
  })

  return NextResponse.redirect(new URL("/dashboard/expenses", request.url), 303)
}
