import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityAccessScope, type CityAccessScope } from "@/lib/auth-helpers"
import OpenAI from "openai"

// SECURITY: assert the tutoringRequest is within the caller's city access scope.
// all → allow; none → 403; single → request.cityId must match the admin's city.
async function assertRequestInScope(
  requestId: string,
  scope: CityAccessScope
): Promise<NextResponse | null> {
  if (scope.kind === "all") return null
  if (scope.kind === "none") return NextResponse.json({ error: "No city access" }, { status: 403 })
  const req = await prisma.tutoringRequest.findUnique({ where: { id: requestId }, select: { cityId: true } })
  if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 })
  if (req.cityId !== scope.cityId) return NextResponse.json({ error: "Out of city scope" }, { status: 403 })
  return null
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return NextResponse.json({ error: "No city access" }, { status: 403 })

  const { requestId } = await request.json()
  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 })
  }

  // SECURITY: request must be within caller's city scope
  const scopeError = await assertRequestInScope(requestId, scope)
  if (scopeError) return scopeError

  const tutoringRequest = await prisma.tutoringRequest.findUnique({
    where: { id: requestId },
  })

  if (!tutoringRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 })
  }

  // SECURITY: scope the waitlist tutor pool to the caller's city
  const waitlistWhere: Record<string, unknown> = { onboarded: false, isActive: true }
  if (scope.kind === "single") waitlistWhere.user = { cityId: scope.cityId }
  const waitlistTutors = await prisma.tutor.findMany({
    where: waitlistWhere,
    include: { user: { select: { id: true, name: true } } },
  })

  if (waitlistTutors.length === 0) {
    return NextResponse.json({ recommendations: [], message: "No tutors on waitlist" })
  }

  // Map to anonymous IDs — no real names or PII sent to OpenAI
  const idMap = new Map<string, string>()
  const anonymousProfiles = waitlistTutors.map((t, i) => {
    const label = `Candidate ${i + 1}`
    idMap.set(label, t.user.name)
    const tenure = t.tenure.replace(/_/g, " ").toLowerCase()
    return `${label} (${tenure}): ${t.subjects || "general"}, grades: ${t.gradeLevels || "any"}`
  }).join("\n")

  const prompt = `Rank the top 3 best-fit candidates for this tutoring request. Only consider subject match and grade level alignment.

REQUEST:
Subject: ${tutoringRequest.subject}
Schedule: ${tutoringRequest.preferredSchedule || "flexible"}

CANDIDATES:
${anonymousProfiles}

Return ONLY a JSON array: [{"name":"Candidate N","score":0-100,"reason":"one sentence"}]`

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-your-key-here") {
    return fallback(waitlistTutors)
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    })

    const text = completion.choices[0]?.message?.content || "[]"
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return fallback(waitlistTutors)

    const recommendations = JSON.parse(jsonMatch[0])
    const mapped = recommendations.map((r: { name: string; score: number; reason: string }) => ({
      ...r,
      name: idMap.get(r.name) || r.name,
    }))

    return NextResponse.json({ recommendations: mapped })
  } catch {
    return fallback(waitlistTutors)
  }
}

function fallback(tutors: Array<{ user: { name: string; id: string } }>) {
  return NextResponse.json({
    recommendations: tutors.slice(0, 3).map((t) => ({
      name: t.user.name,
      score: 50,
      reason: "Basic ranking (no AI key configured)",
    })),
  })
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return NextResponse.json({ error: "No city access" }, { status: 403 })

  const formData = await request.formData()
  const requestId = formData.get("requestId") as string
  const matchedTutorId = formData.get("matchedTutorId") as string

  if (!requestId || !matchedTutorId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  // SECURITY: request must be within caller's city scope
  const scopeError = await assertRequestInScope(requestId, scope)
  if (scopeError) return scopeError

  // SECURITY: chosen tutor must also be within caller's city scope
  if (scope.kind === "single") {
    const tutor = await prisma.tutor.findUnique({
      where: { id: matchedTutorId },
      select: { user: { select: { cityId: true } } },
    })
    if (!tutor || tutor.user.cityId !== scope.cityId) {
      return NextResponse.json({ error: "Tutor out of city scope" }, { status: 403 })
    }
  }

  await prisma.tutoringRequest.update({
    where: { id: requestId },
    data: { status: "MATCHED", matchedTutorId },
  })

  return NextResponse.json({ success: true })
}
