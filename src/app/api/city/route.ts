import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const cities = await prisma.city.findMany({ select: { id: true, name: true } })
  const cookieStore = await cookies()
  const selected = cookieStore.get("selectedCity")?.value || cities[0]?.id || "all"
  return NextResponse.json({ selected, cities })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { city } = await request.json()
  if (city && city !== "all") {
    const exists = await prisma.city.findUnique({ where: { id: city } })
    if (!exists) return NextResponse.json({ error: "Invalid city" }, { status: 400 })
  }
  const cookieStore = await cookies()
  cookieStore.set("selectedCity", city || "all", { path: "/" })
  return NextResponse.json({ success: true })
}
