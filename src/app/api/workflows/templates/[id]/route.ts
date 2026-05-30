import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import { Resend } from "resend"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const { name, subject, htmlBody, isActive } = await request.json()

  const template = await prisma.emailTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(subject !== undefined && { subject }),
      ...(htmlBody !== undefined && { htmlBody }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  return NextResponse.json({ template })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  await prisma.emailTemplate.delete({ where: { id } })

  return NextResponse.json({ success: true })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const { testEmail } = await request.json()

  if (!testEmail) {
    return NextResponse.json({ error: "testEmail is required" }, { status: 400 })
  }

  const template = await prisma.emailTemplate.findUnique({ where: { id } })
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 })
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)

    const html = template.htmlBody
      .replace(/\{\{name\}\}/g, "Test User")
      .replace(/\{\{parentName\}\}/g, "Test Parent")
      .replace(/\{\{tutorName\}\}/g, "Test Tutor")
      .replace(/\{\{message\}\}/g, "<p>This is a test message from your email template.</p>")
      .replace(/\{\{uploadUrl\}\}/g, "https://example.com/upload/test")
      .replace(/\{\{inviteUrl\}\}/g, "https://example.com/invite/test")

    await resend.emails.send({
      from: "J.A.S.S. Tutors <info@jasstutors.com>",
      to: testEmail,
      subject: `[TEST] ${template.subject}`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send test email"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
