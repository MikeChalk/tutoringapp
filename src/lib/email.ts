import { Resend } from "resend"
import { prisma } from "@/lib/db"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function log(email: { to: string; subject: string }) {
  console.log(`[EMAIL SKIPPED] To: ${email.to} — ${email.subject}`)
}

async function recordLog(to: string, subject: string, trigger: string) {
  try {
    await prisma.emailLog.create({ data: { to, subject, trigger } })
  } catch { /* log unavailable */ }
}

async function shouldSendEmail(email: string): Promise<boolean> {
  try {
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
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value)
  }
  return result
}

export async function sendCareerApplicationEmail(to: string, name: string, uploadUrl: string) {
  const template = await getTemplate("career_application")
  const subject = template?.subject || "Thank you for your application — Next Steps"
  const html = template
    ? render(template.htmlBody, { name, uploadUrl })
    : `<p>Hi ${name},</p><p>Thank you for applying to tutor with J.A.S.S.!</p><p>To complete your application, please upload your documents here:</p><p style="margin:16px 0"><a href="${uploadUrl}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">Upload CV & Transcript</a></p><p>You can also paste this link: ${uploadUrl}</p><p>Once we receive these, we'll review your profile and reach out when a matching client is available.</p><p>— J.A.S.S. Tutors</p>`

  if (!resend) { log({ to, subject }); return }
  await recordLog(to, subject, "career_application")
  await resend.emails.send({
    from: "J.A.S.S. Tutors <info@jasstutors.com>",
    to,
    subject,
    html,
  })
}

export async function sendOnboardingEmail(to: string, name: string, message: string, trigger: "onboarding_welcome" | "contract_signed" = "onboarding_welcome") {
  const template = await getTemplate(trigger)
  const subject = template?.subject || (trigger === "contract_signed" ? "Contract Signed — Welcome to J.A.S.S." : "Welcome to J.A.S.S. — Next Steps")
  const html = template
    ? render(template.htmlBody, { name, message })
    : trigger === "contract_signed"
      ? `<p>Hi ${name},</p>${message}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`
      : `<p>Hi ${name},</p>${message}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`

  if (!resend) { log({ to, subject }); return }
  if (!(await shouldSendEmail(to))) return
  await recordLog(to, subject, trigger)
  await resend.emails.send({
    from: "J.A.S.S. Tutors <info@jasstutors.com>",
    to,
    subject,
    html,
  })
}

export async function sendClientInviteEmail(to: string, name: string, inviteUrl: string, trigger: "client_invite" | "payment_received" | "invoice_reminder" = "client_invite") {
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

  if (!resend) { log({ to, subject }); return }
  await recordLog(to, subject, trigger)
  await resend.emails.send({
    from: "J.A.S.S. Tutors <info@jasstutors.com>",
    to,
    subject,
    html,
  })
}

export async function sendParentNotificationEmail(to: string, parentName: string, tutorName: string, message: string) {
  const template = await getTemplate("parent_tutor_match")
  const subject = template?.subject || "Your tutor match from J.A.S.S."
  const html = template
    ? render(template.htmlBody, { parentName, tutorName, message: message || `<p>We've matched you with ${tutorName}. They will be reaching out to you shortly to arrange the first session.</p>` })
    : `<p>Hi ${parentName},</p>${message || `<p>We've matched you with ${tutorName}. They will be reaching out to you shortly to arrange the first session.</p>`}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`

  if (!resend) { log({ to, subject }); return }
  await recordLog(to, subject, "parent_tutor_match")
  await resend.emails.send({
    from: "J.A.S.S. Tutors <info@jasstutors.com>",
    to,
    subject,
    html,
  })
}
