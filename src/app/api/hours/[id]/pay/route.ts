import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityAccessScope, assertInScope, safeReferer } from "@/lib/auth-helpers"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const hourLog = await prisma.hourLog.findUnique({ where: { id }, select: { paidAt: true, project: { select: { cityId: true } } } })
  if (!hourLog) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  const scopeError = assertInScope(hourLog.project.cityId, scope)
  if (scopeError) return scopeError

  await prisma.hourLog.update({
    where: { id },
    data: { paidAt: hourLog.paidAt ? null : new Date() },
  })

  const referer = safeReferer(request.headers.get("referer"), "/dashboard/payments")
  return NextResponse.redirect(new URL(referer, request.url), 303)
}
