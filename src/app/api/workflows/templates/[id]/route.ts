import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import { sendEmail, hasEmailTransport } from "@/lib/email"

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

  if (!(await hasEmailTransport())) {
    return NextResponse.json({ error: "Email not configured — set up SMTP or Resend in Settings" }, { status: 500 })
  }

  try {
    const html = template.htmlBody
      .replace(/\{\{name\}\}/g, "Test User")
      .replace(/\{\{parentName\}\}/g, "Test Parent")
      .replace(/\{\{tutorName\}\}/g, "Test Tutor")
      .replace(/\{\{message\}\}/g, "<p>This is a test message from your email template.</p>")
      .replace(/\{\{uploadUrl\}\}/g, "https://example.com/upload/test")
      .replace(/\{\{inviteUrl\}\}/g, "https://example.com/invite/test")

    await sendEmail({
      from: "J.A.S.S. Tutors <info@jasstutors.com>",
      to: testEmail,
      subject: `[TEST] ${template.subject}`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[workflows/test]", err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
