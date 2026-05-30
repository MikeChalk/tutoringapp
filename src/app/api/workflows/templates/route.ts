import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"
import { EMAIL_TRIGGERS, EMAIL_TRIGGER_DEFAULTS } from "@/lib/constants"

async function seedDefaults() {
  const existing = await prisma.emailTemplate.findMany({ select: { trigger: true } })
  const triggers = new Set(existing.map(e => e.trigger))
  for (const t of EMAIL_TRIGGERS) {
    if (!triggers.has(t.value)) {
      const def = EMAIL_TRIGGER_DEFAULTS[t.value]
      if (def) {
        await prisma.emailTemplate.create({
          data: {
            name: def.name,
            trigger: t.value,
            subject: def.subject,
            htmlBody: def.htmlBody,
          },
        })
      }
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
