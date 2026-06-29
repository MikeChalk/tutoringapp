import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const ADMIN = "ADMIN" as const
const CITY_ADMIN = "CITY_ADMIN" as const
const TUTOR = "TUTOR" as const
const CLIENT = "CLIENT" as const

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")
  return session
}

export async function getTutorId(userId: string, email: string) {
  const byId = await prisma.tutor.findUnique({ where: { userId } })
  if (byId) return byId.id
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return null
  const tutor = await prisma.tutor.findUnique({ where: { userId: user.id } })
  return tutor?.id ?? null
}

export async function getClientId(userId: string, email: string) {
  const byId = await prisma.client.findUnique({ where: { userId } })
  if (byId) return byId.id
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return null
  const client = await prisma.client.findUnique({ where: { userId: user.id } })
  return client?.id ?? null
}

export function isAdmin(role: string) {
  return role === ADMIN || role === CITY_ADMIN
}

export function isSuperAdmin(role: string) {
  return role === ADMIN
}

export function isCityAdmin(role: string) {
  return role === CITY_ADMIN
}

export function isTutor(role: string) {
  return role === TUTOR
}

export function isClient(role: string) {
  return role === CLIENT
}

export async function getActiveCityId(userRole: string, userId: string): Promise<string | null> {
  if (isCityAdmin(userRole)) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { cityId: true } })
    return user?.cityId || null
  }
  if (isSuperAdmin(userRole)) {
    const cookieStore = await cookies()
    const selectedCity = cookieStore.get("selectedCity")?.value
    if (selectedCity && selectedCity !== "all") return selectedCity
    return null
  }
  return null
}

export type CityAccessScope =
  | { kind: "all" }
  | { kind: "single"; cityId: string }
  | { kind: "none" }

export async function getCityAccessScope(userRole: string, userId: string): Promise<CityAccessScope> {
  if (isCityAdmin(userRole)) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { cityId: true } })
    if (user?.cityId) return { kind: "single", cityId: user.cityId }
    return { kind: "none" }
  }
  return { kind: "all" }
}

export async function getCityFilter(userRole: string, userId: string): Promise<Record<string, unknown>> {
  const scope = await getCityAccessScope(userRole, userId)
  if (scope.kind === "single") return { cityId: scope.cityId }
  if (scope.kind === "none") return { cityId: { in: [] as string[] } }
  return {}
}

export function assertInScope(
  resourceCityId: string | null | undefined,
  scope: CityAccessScope
): NextResponse | null {
  if (scope.kind === "all") return null
  if (scope.kind === "none") return NextResponse.json({ error: "No city access" }, { status: 403 })
  if (resourceCityId !== scope.cityId) return NextResponse.json({ error: "Out of city scope" }, { status: 403 })
  return null
}

export function safeReferer(referer: string | null, fallback: string): string {
  if (!referer) return fallback
  if (referer.startsWith("/")) return referer
  return fallback
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
