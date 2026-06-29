import { Resend } from "resend"
import nodemailer from "nodemailer"
import { prisma } from "@/lib/db"
import { escapeHtml } from "@/lib/auth-helpers"
import { decryptSecret } from "@/lib/secret"

export interface EmailOptions {
  from: string
  to: string
  subject: string
  html?: string
  text?: string
  replyTo?: string
  attachments?: Array<{ filename: string; content: string; encoding?: string }>
}

type Transport =
  | { type: "smtp"; transporter: nodemailer.Transporter }
  | { type: "resend"; client: Resend }

let cachedTransport: Transport | null | undefined

export function invalidateEmailTransport() {
  cachedTransport = undefined
}

async function getTransport(): Promise<Transport | null> {
  if (cachedTransport !== undefined) return cachedTransport

  try {
    const settings = await prisma.companySettings.findUnique({
      where: { id: "main" },
      select: { smtpHost: true, smtpPort: true, smtpUser: true, smtpPassword: true, resendKey: true },
    })

    if (settings?.smtpHost && settings?.smtpUser) {
      const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort || 587,
        secure: (settings.smtpPort || 587) === 465,
        auth: { user: settings.smtpUser, pass: decryptSecret(settings.smtpPassword) },
      })
      cachedTransport = { type: "smtp", transporter }
      return cachedTransport
    }

    const resendKey = decryptSecret(settings?.resendKey || "")
    if (resendKey) {
      cachedTransport = { type: "resend", client: new Resend(resendKey) }
      return cachedTransport
    }
  } catch { /* DB unavailable */ }

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" },
    })
    cachedTransport = { type: "smtp", transporter }
    return cachedTransport
  }

  if (process.env.RESEND_API_KEY) {
    cachedTransport = { type: "resend", client: new Resend(process.env.RESEND_API_KEY) }
    return cachedTransport
  }

  cachedTransport = null
  return null
}

export async function sendEmail(opts: EmailOptions): Promise<void> {
  const transport = await getTransport()
  if (!transport) throw new Error("No email transport configured")

  if (transport.type === "smtp") {
    const attachments = opts.attachments?.map(a => ({
      filename: a.filename,
      content: a.encoding === "base64" ? Buffer.from(a.content, "base64") : a.content,
    }))
    await transport.transporter.sendMail({ ...opts, attachments })
  } else {
    await transport.client.emails.send(opts)
  }
}

export async function hasEmailTransport(): Promise<boolean> {
  const transport = await getTransport()
  return transport !== null
}

function log(email: { to: string; subject: string }) {
  console.log(`[EMAIL SKIPPED] To: ${email.to} — ${email.subject}`)
}

async function recordLog(to: string, subject: string, trigger: string) {
  try {
    await prisma.emailLog.create({ data: { to, subject, trigger } })
  } catch { /* log unavailable */ }
}

export async function isEmailGloballyEnabled(): Promise<boolean> {
  try {
    const settings = await prisma.companySettings.findUnique({ where: { id: "main" }, select: { emailEnabled: true } })
    return settings?.emailEnabled !== false
  } catch { return true }
}

async function shouldSendEmail(email: string): Promise<boolean> {
  try {
    const settings = await prisma.companySettings.findUnique({ where: { id: "main" }, select: { emailEnabled: true } })
    if (settings?.emailEnabled === false) return false
    const user = await prisma.user.findUnique({ where: { email }, select: { emailNotifications: true } })
    return user?.emailNotifications !== false
  } catch { return true }
}

async function getTemplate(trigger: string) {
  try {
    const tpl = await prisma.emailTemplate.findUnique({ where: { trigger } })
    if (tpl && tpl.isActive) return tpl
  } catch { /* DB unavailable, use default */ }
  return null
}

function render(html: string, vars: Record<string, string>): string {
  let result = html
  for (const [key, value] of Object.entries(vars)) {
    const escaped = key === "message" ? value : escapeHtml(value)
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), escaped)
  }
  return result
}

export async function sendCareerApplicationEmail(to: string, name: string, uploadUrl: string) {
  if (!(await isEmailGloballyEnabled())) { log({ to, subject: "Career Application" }); return }
  const template = await getTemplate("career_application")
  const subject = template?.subject || "Thank you for your application — Next Steps"
  const html = template
    ? render(template.htmlBody, { name, uploadUrl })
    : `<p>Hi ${name},</p><p>Thank you for applying to tutor with J.A.S.S.!</p><p>To complete your application, please upload your documents here:</p><p style="margin:16px 0"><a href="${uploadUrl}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">Upload CV & Transcript</a></p><p>You can also paste this link: ${uploadUrl}</p><p>Once we receive these, we'll review your profile and reach out when a matching client is available.</p><p>— J.A.S.S. Tutors</p>`

  if (!(await hasEmailTransport())) { log({ to, subject }); return }
  await sendEmail({
    from: "J.A.S.S. Tutors <info@jasstutors.com>",
    to,
    subject,
    html,
  })
  await recordLog(to, subject, "career_application").catch(() => {})
}

export async function sendOnboardingEmail(to: string, name: string, message: string, trigger = "onboarding_welcome") {
  if (!(await isEmailGloballyEnabled())) { log({ to, subject: trigger }); return }
  const template = await getTemplate(trigger)
  const subject = template?.subject || (trigger === "contract_signed" ? "Contract Signed — Welcome to J.A.S.S." : "Welcome to J.A.S.S. — Next Steps")
  const html = template
    ? render(template.htmlBody, { name, message })
    : trigger === "contract_signed"
      ? `<p>Hi ${name},</p>${message}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`
      : `<p>Hi ${name},</p>${message}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`

  if (!(await hasEmailTransport())) { log({ to, subject }); return }
  if (!(await shouldSendEmail(to))) return
  await sendEmail({
    from: "J.A.S.S. Tutors <info@jasstutors.com>",
    to,
    subject,
    html,
  })
  await recordLog(to, subject, trigger).catch(() => {})
}

export async function sendClientInviteEmail(to: string, name: string, inviteUrl: string, trigger: "client_invite" | "payment_received" | "invoice_reminder" = "client_invite") {
  if (!(await isEmailGloballyEnabled())) { log({ to, subject: trigger }); return }
  const template = await getTemplate(trigger)
  const fallbackSubject = trigger === "payment_received"
    ? "Payment Received — Thank You"
    : trigger === "invoice_reminder"
      ? "Reminder: Outstanding Invoice"
      : "Your J.A.S.S. account — Complete Setup"
  const fallbackHtml = trigger === "payment_received"
    ? `<p>Hi ${name},</p><p>Your payment has been received. Thank you for your business!</p><p style="margin:16px 0"><a href="${inviteUrl}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">View Invoice</a></p><p>— J.A.S.S. Tutors</p>`
    : trigger === "invoice_reminder"
      ? `<p>Hi ${name},</p><p>This is a friendly reminder that you have an outstanding invoice. Please log in to view and pay it.</p><p style="margin:16px 0"><a href="${inviteUrl}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">View Invoice</a></p><p>— J.A.S.S. Tutors</p>`
      : `<p>Hi ${name},</p><p>You've been added as a client of J.A.S.S. Tutoring Services. Please complete your account setup to view and pay invoices.</p><p style="margin:16px 0"><a href="${inviteUrl}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">Set Up Your Account</a></p><p>You can also paste this link: ${inviteUrl}</p><p>— J.A.S.S. Tutors</p>`

  const subject = template?.subject || fallbackSubject
  const html = template ? render(template.htmlBody, { name, inviteUrl }) : fallbackHtml

  if (!(await hasEmailTransport())) { log({ to, subject }); return }
  await sendEmail({
    from: "J.A.S.S. Tutors <info@jasstutors.com>",
    to,
    subject,
    html,
  })
  await recordLog(to, subject, trigger).catch(() => {})
}

export async function sendParentNotificationEmail(to: string, parentName: string, tutorName: string, message: string) {
  if (!(await isEmailGloballyEnabled())) { log({ to, subject: "Parent Match" }); return }
  const template = await getTemplate("parent_tutor_match")
  const subject = template?.subject || "Your tutor match from J.A.S.S."
  const html = template
    ? render(template.htmlBody, { parentName, tutorName, message: message || `<p>We've matched you with ${tutorName}. They will be reaching out to you shortly to arrange the first session.</p>` })
    : `<p>Hi ${parentName},</p>${message || `<p>We've matched you with ${tutorName}. They will be reaching out to you shortly to arrange the first session.</p>`}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`

  if (!(await hasEmailTransport())) { log({ to, subject }); return }
  await sendEmail({
    from: "J.A.S.S. Tutors <info@jasstutors.com>",
    to,
    subject,
    html,
  })
  await recordLog(to, subject, "parent_tutor_match").catch(() => {})
}
