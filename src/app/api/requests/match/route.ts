import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import OpenAI from "openai"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { requestId } = await request.json()
  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 })
  }

  const tutoringRequest = await prisma.tutoringRequest.findUnique({
    where: { id: requestId },
  })

  if (!tutoringRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 })
  }

  const waitlistTutors = await prisma.tutor.findMany({
    where: { onboarded: false, isActive: true },
    include: { user: { select: { name: true, email: true } } },
  })

  if (waitlistTutors.length === 0) {
    return NextResponse.json({ recommendations: [], message: "No tutors on waitlist" })
  }

  const tutorProfiles = waitlistTutors.map((t) =>
    `${t.user.name} (${t.tenure.replace("_", " ")}): ${t.subjects || "general"} - ${t.bio || "No bio"}`
  ).join("\n")

  const prompt = `You are matching tutors to a tutoring request. Analyze the request below and rank the top 3 best-fit tutors from the waitlist.

REQUEST:
Subject: ${tutoringRequest.subject}
Description: ${tutoringRequest.description || "N/A"}
Schedule: ${tutoringRequest.preferredSchedule || "N/A"}

WAITLIST TUTORS:
${tutorProfiles}

Return ONLY a JSON array of objects with tutor name (exact match from list), score (0-100), and reason (one sentence). Example:
[{"name":"Sarah Chen","score":95,"reason":"Expert in subject with matching availability"}]`

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    })

    const text = completion.choices[0]?.message?.content || "[]"
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      const fallback = waitlistTutors.slice(0, 3).map((t) => ({ name: t.user.name, score: 50, reason: "Fallback recommendation" }))
      return NextResponse.json({ recommendations: fallback })
    }

    const recommendations = JSON.parse(jsonMatch[0])
    return NextResponse.json({ recommendations })
  } catch (error) {
    const fallback = waitlistTutors.slice(0, 3).map((t) => ({
      name: t.user.name,
      score: 50,
      reason: "Unable to reach AI, showing waitlist",
    }))
    return NextResponse.json({ recommendations: fallback })
  }
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const requestId = formData.get("requestId") as string
  const matchedTutorId = formData.get("matchedTutorId") as string

  if (!requestId || !matchedTutorId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  await prisma.tutoringRequest.update({
    where: { id: requestId },
    data: { status: "MATCHED", matchedTutorId },
  })

  return NextResponse.json({ success: true })
}
