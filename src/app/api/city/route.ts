import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { getCityAccessScope, isCityAdmin } from "@/lib/auth-helpers"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // SECURITY: CITY_ADMIN sees only their own city; null-city → none.
  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "single") {
    const city = await prisma.city.findUnique({ where: { id: scope.cityId }, select: { id: true, name: true } })
    return NextResponse.json({ selected: scope.cityId, cities: city ? [city] : [] })
  }
  if (scope.kind === "none") return NextResponse.json({ selected: "all", cities: [] })

  const cities = await prisma.city.findMany({ select: { id: true, name: true } })
  const cookieStore = await cookies()
  const selected = cookieStore.get("selectedCity")?.value || cities[0]?.id || "all"
  return NextResponse.json({ selected, cities })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // CITY_ADMIN scope uses user.cityId (cookie is ignored); no dropdown → 403 for hygiene.
  if (isCityAdmin(session.user.role)) {
    return NextResponse.json({ error: "City selection not available for city admins" }, { status: 403 })
  }

  const { city } = await request.json()
  if (city && city !== "all") {
    const exists = await prisma.city.findUnique({ where: { id: city } })
    if (!exists) return NextResponse.json({ error: "Invalid city" }, { status: 400 })
  }
  const cookieStore = await cookies()
  cookieStore.set("selectedCity", city || "all", { path: "/" })
  return NextResponse.json({ success: true })
}
