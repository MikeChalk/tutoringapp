import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"

export async function GET() {
  const cities = await prisma.city.findMany({ select: { id: true, name: true } })
  const cookieStore = await cookies()
  const selected = cookieStore.get("selectedCity")?.value || "all"
  return NextResponse.json({ selected, cities })
}

export async function POST(request: Request) {
  const { city } = await request.json()
  const cookieStore = await cookies()
  cookieStore.set("selectedCity", city || "all", { path: "/" })
  return NextResponse.json({ success: true })
}
