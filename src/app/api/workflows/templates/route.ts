import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

const DEFAULT_TEMPLATES: Array<{ name: string; trigger: string; subject: string; htmlBody: string }> = [
  {
    name: "Career Application - Upload Request",
    trigger: "career_application",
    subject: "Thank you for your application — Next Steps",
    htmlBody: `<p>Hi {{name}},</p><p>Thank you for applying to tutor with J.A.S.S.!</p><p>To complete your application, please upload your documents here:</p><p style="margin:16px 0"><a href="{{uploadUrl}}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">Upload CV & Transcript</a></p><p>You can also paste this link: {{uploadUrl}}</p><p>Once we receive these, we'll review your profile and reach out when a matching client is available.</p><p>— J.A.S.S. Tutors</p>`,
  },
  {
    name: "Onboarding Welcome",
    trigger: "onboarding_welcome",
    subject: "Welcome to J.A.S.S. — Next Steps",
    htmlBody: `<p>Hi {{name}},</p>{{message}}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`,
  },
  {
    name: "Parent - Tutor Match Notification",
    trigger: "parent_tutor_match",
    subject: "Your tutor match from J.A.S.S.",
    htmlBody: `<p>Hi {{parentName}},</p>{{message}}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`,
  },
  {
    name: "Contract Signed Confirmation",
    trigger: "contract_signed",
    subject: "Contract Signed — Welcome to J.A.S.S.",
    htmlBody: `<p>Hi {{name}},</p>{{message}}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`,
  },
  {
    name: "Client Account Invite",
    trigger: "client_invite",
    subject: "Your J.A.S.S. account — Complete Setup",
    htmlBody: `<p>Hi {{name}},</p><p>You've been added as a client of J.A.S.S. Tutoring Services. Please complete your account setup to view and pay invoices.</p><p style="margin:16px 0"><a href="{{inviteUrl}}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">Set Up Your Account</a></p><p>You can also paste this link: {{inviteUrl}}</p><p>— J.A.S.S. Tutors</p>`,
  },
  {
    name: "Payment Received",
    trigger: "payment_received",
    subject: "Payment Received — Thank You",
    htmlBody: `<p>Hi {{name}},</p>{{message}}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`,
  },
  {
    name: "Invoice Payment Reminder",
    trigger: "invoice_reminder",
    subject: "Reminder: Outstanding Invoice",
    htmlBody: `<p>Hi {{name}},</p><p>This is a friendly reminder that you have an outstanding invoice. Please log in to view and pay it.</p><p style="margin:16px 0"><a href="{{inviteUrl}}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">View Invoice</a></p><p>— J.A.S.S. Tutors</p>`,
  },
]

async function seedDefaults() {
  const existing = await prisma.emailTemplate.findMany({ select: { trigger: true } })
  const triggers = new Set(existing.map(e => e.trigger))
  for (const tpl of DEFAULT_TEMPLATES) {
    if (!triggers.has(tpl.trigger)) {
      await prisma.emailTemplate.create({ data: tpl })
    }
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await seedDefaults()

  const templates = await prisma.emailTemplate.findMany({
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ templates })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { name, trigger, subject, htmlBody } = await request.json()

  if (!name || !trigger || !subject || !htmlBody) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }

  const existing = await prisma.emailTemplate.findUnique({ where: { trigger } })
  if (existing) {
    return NextResponse.json({ error: "A template with this trigger already exists" }, { status: 409 })
  }

  const template = await prisma.emailTemplate.create({
    data: { name, trigger, subject, htmlBody },
  })

  return NextResponse.json({ template })
}
