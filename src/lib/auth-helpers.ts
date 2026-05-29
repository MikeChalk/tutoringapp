import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect("/login")
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
  return role === "ADMIN"
}

export function isTutor(role: string) {
  return role === "TUTOR"
}

export function isClient(role: string) {
  return role === "CLIENT"
}
