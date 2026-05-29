import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import { Resend } from "resend"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const group = searchParams.get("group") || "waitlist"
  const emails = await getRecipients(group)
  return NextResponse.json({ count: emails.length })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const group = formData.get("group") as string
  const subject = formData.get("subject") as string
  const message = formData.get("message") as string

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message required" }, { status: 400 })
  }

  const emails = await getRecipients(group)
  if (emails.length === 0) return NextResponse.json({ error: "No recipients found" }, { status: 400 })

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  if (!resend) {
    console.log(`[BULK EMAIL SKIPPED] Group: ${group}, ${emails.length} recipients, Subject: ${subject}`)
    return NextResponse.json({ sent: emails.length, note: "Resend not configured — emails logged only" })
  }

  const settings = await prisma.companySettings.findUnique({ where: { id: "main" } })
  const companyName = settings?.name || "J.A.S.S. Tutors"

  for (const email of emails) {
    try {
      await resend.emails.send({
        from: `${companyName} <info@jasstutors.com>`,
        to: email,
        subject,
        html: `<p>${message.replace(/\n/g, "</p><p>")}</p><p style="margin-top:16px">— ${companyName}</p>`,
      })
    } catch {}
  }

  return NextResponse.json({ sent: emails.length })
}

async function getRecipients(group: string): Promise<string[]> {
  if (group === "waitlist") {
    const tutors = await prisma.tutor.findMany({
      where: { onboarded: false, isActive: true },
      include: { user: { select: { email: true } } },
    })
    return tutors.map(t => t.user.email)
  }

  if (group === "team") {
    const users = await prisma.user.findMany({
      where: { role: { in: ["TUTOR", "ADMIN", "CITY_ADMIN"] } },
      select: { email: true },
    })
    return users.map(u => u.email)
  }

  if (group === "tutors") {
    const users = await prisma.user.findMany({
      where: { role: "TUTOR" },
      select: { email: true },
    })
    return users.map(u => u.email)
  }

  if (group === "supervisors") {
    const tutors = await prisma.tutor.findMany({
      where: { contract: { type: "PROGRAM_SUPERVISOR", status: "ACTIVE" } },
      include: { user: { select: { email: true } } },
    })
    return tutors.map(t => t.user.email)
  }

  return []
}
