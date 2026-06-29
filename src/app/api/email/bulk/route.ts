import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityFilter } from "@/lib/auth-helpers"
import { sendEmail, hasEmailTransport } from "@/lib/email"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cityFilter = await getCityFilter(session.user.role, session.user.id)

  const { searchParams } = new URL(request.url)
  const group = searchParams.get("group") || "waitlist"
  const emails = await getRecipients(group, cityFilter)
  return NextResponse.json({ count: emails.length })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cityFilter = await getCityFilter(session.user.role, session.user.id)

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
    if (!sent) return NextResponse.json({ error: "Email not configured — set up SMTP or Resend in Settings" }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Bulk send
  const group = formData.get("group") as string
  const subject = (formData.get("subject") as string)?.trim()
  const message = (formData.get("message") as string)?.trim()

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message required" }, { status: 400 })
  }

  const recipients = await getRecipientsWithNames(group, cityFilter)
  if (recipients.length === 0) return NextResponse.json({ error: "No recipients found" }, { status: 400 })

  if (!(await hasEmailTransport())) {
    console.log(`[BULK EMAIL SKIPPED] Group: ${group}, ${recipients.length} recipients, Subject: ${subject}`)
    return NextResponse.json({ sent: recipients.length, note: "Email not configured — emails logged only" })
  }

  let sent = 0
  let failed = 0

  for (const r of recipients) {
    const ok = await sendOne(r.email, r.name, subject, message)
    if (ok) {
      sent++
      // Log each sent email
      try { await prisma.emailLog.create({ data: { to: r.email, subject, trigger: "bulk_email" } }) } catch (e) { console.error("[emailLog]", e) }
    } else {
      failed++
    }
  }

  return NextResponse.json({ sent, failed: failed || undefined })
}

async function sendOne(to: string, name: string, subject: string, html: string): Promise<boolean> {
  if (!(await hasEmailTransport())) return false

  const settings = await prisma.companySettings.findUnique({ where: { id: "main" } })
  const companyName = settings?.name || "J.A.S.S. Tutors"

  const personalized = html.replace(/\{\{name\}\}/g, name)

  try {
    await sendEmail({
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

async function getRecipients(group: string, cityFilter: Record<string, unknown>): Promise<string[]> {
  const recipients = await getRecipientsWithNames(group, cityFilter)
  return recipients.map(r => r.email)
}

async function getRecipientsWithNames(group: string, cityFilter: Record<string, unknown>): Promise<Array<{ email: string; name: string }>> {
  if (group === "waitlist") {
    const tutors = await prisma.tutor.findMany({
      where: { onboarded: false, isActive: true, user: cityFilter },
      include: { user: { select: { email: true, name: true } } },
    })
    return tutors.map(t => ({ email: t.user.email, name: t.user.name }))
  }

  if (group === "team") {
    const users = await prisma.user.findMany({
      where: { role: { in: ["TUTOR", "ADMIN", "CITY_ADMIN"] }, ...cityFilter },
      select: { email: true, name: true },
    })
    return users.map(u => ({ email: u.email, name: u.name }))
  }

  if (group === "tutors") {
    const users = await prisma.user.findMany({
      where: { role: "TUTOR", ...cityFilter },
      select: { email: true, name: true },
    })
    return users.map(u => ({ email: u.email, name: u.name }))
  }

  if (group === "supervisors") {
    const tutors = await prisma.tutor.findMany({
      where: { contracts: { some: { type: "PROGRAM_SUPERVISOR", status: "ACTIVE" } }, user: cityFilter },
      include: { user: { select: { email: true, name: true } } },
    })
    return tutors.map(t => ({ email: t.user.email, name: t.user.name }))
  }

  return []
}
