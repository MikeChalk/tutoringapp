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
  const action = formData.get("_action") as string

  // Test email
  if (action === "test") {
    const to = (formData.get("to") as string)?.trim()
    const subject = (formData.get("subject") as string)?.trim()
    const message = (formData.get("message") as string)?.trim()

    if (!to || !subject || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    const sent = await sendOne(to, "Test User", subject, message)
    if (!sent) return NextResponse.json({ error: "Resend not configured" }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Bulk send
  const group = formData.get("group") as string
  const subject = (formData.get("subject") as string)?.trim()
  const message = (formData.get("message") as string)?.trim()

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message required" }, { status: 400 })
  }

  const recipients = await getRecipientsWithNames(group)
  if (recipients.length === 0) return NextResponse.json({ error: "No recipients found" }, { status: 400 })

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  if (!resend) {
    console.log(`[BULK EMAIL SKIPPED] Group: ${group}, ${recipients.length} recipients, Subject: ${subject}`)
    return NextResponse.json({ sent: recipients.length, note: "Resend not configured — emails logged only" })
  }

  let sent = 0
  let failed = 0

  for (const r of recipients) {
    const ok = await sendOne(r.email, r.name, subject, message)
    if (ok) sent++; else failed++
  }

  return NextResponse.json({ sent, failed: failed || undefined })
}

async function sendOne(to: string, name: string, subject: string, html: string): Promise<boolean> {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  if (!resend) return false

  const settings = await prisma.companySettings.findUnique({ where: { id: "main" } })
  const companyName = settings?.name || "J.A.S.S. Tutors"

  const personalized = html.replace(/\{\{name\}\}/g, name)

  try {
    await resend.emails.send({
      from: `${companyName} <info@jasstutors.com>`,
      to,
      subject,
      html: `${personalized}<p style="margin-top:16px">— ${companyName}</p>`,
    })
    return true
  } catch {
    return false
  }
}

async function getRecipients(group: string): Promise<string[]> {
  const recipients = await getRecipientsWithNames(group)
  return recipients.map(r => r.email)
}

async function getRecipientsWithNames(group: string): Promise<Array<{ email: string; name: string }>> {
  if (group === "waitlist") {
    const tutors = await prisma.tutor.findMany({
      where: { onboarded: false, isActive: true },
      include: { user: { select: { email: true, name: true } } },
    })
    return tutors.map(t => ({ email: t.user.email, name: t.user.name }))
  }

  if (group === "team") {
    const users = await prisma.user.findMany({
      where: { role: { in: ["TUTOR", "ADMIN", "CITY_ADMIN"] } },
      select: { email: true, name: true },
    })
    return users.map(u => ({ email: u.email, name: u.name }))
  }

  if (group === "tutors") {
    const users = await prisma.user.findMany({
      where: { role: "TUTOR" },
      select: { email: true, name: true },
    })
    return users.map(u => ({ email: u.email, name: u.name }))
  }

  if (group === "supervisors") {
    const tutors = await prisma.tutor.findMany({
      where: { contract: { type: "PROGRAM_SUPERVISOR", status: "ACTIVE" } },
      include: { user: { select: { email: true, name: true } } },
    })
    return tutors.map(t => ({ email: t.user.email, name: t.user.name }))
  }

  return []
}
