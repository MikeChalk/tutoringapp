import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function log(email: { to: string; subject: string }) {
  console.log(`[EMAIL SKIPPED] To: ${email.to} — ${email.subject}`)
}

export async function sendCareerApplicationEmail(to: string, name: string, uploadUrl: string) {
  if (!resend) { log({ to, subject: "Career application" }); return }
  await resend.emails.send({
    from: "J.A.S.S. Tutors <info@jasstutors.com>",
    to,
    subject: "Thank you for your application — Next Steps",
    html: `<p>Hi ${name},</p><p>Thank you for applying to tutor with J.A.S.S.!</p><p>To complete your application, please upload your documents here:</p><p style="margin:16px 0"><a href="${uploadUrl}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">Upload CV & Transcript</a></p><p>You can also paste this link: ${uploadUrl}</p><p>Once we receive these, we'll review your profile and reach out when a matching client is available.</p><p>— J.A.S.S. Tutors</p>`,
  })
}

export async function sendOnboardingEmail(to: string, name: string, message: string) {
  if (!resend) { log({ to, subject: "Onboarding" }); return }
  await resend.emails.send({
    from: "J.A.S.S. Tutors <info@jasstutors.com>",
    to,
    subject: "Welcome to J.A.S.S. — Next Steps",
    html: `<p>Hi ${name},</p>${message}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`,
  })
}

export async function sendClientInviteEmail(to: string, name: string, inviteUrl: string) {
  if (!resend) { log({ to, subject: "Client invite" }); return }
  await resend.emails.send({
    from: "J.A.S.S. Tutors <info@jasstutors.com>",
    to,
    subject: "Your J.A.S.S. account — Complete Setup",
    html: `<p>Hi ${name},</p><p>You've been added as a client of J.A.S.S. Tutoring Services. Please complete your account setup to view and pay invoices.</p><p style="margin:16px 0"><a href="${inviteUrl}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">Set Up Your Account</a></p><p>You can also paste this link: ${inviteUrl}</p><p>— J.A.S.S. Tutors</p>`,
  })
}

export async function sendParentNotificationEmail(to: string, parentName: string, tutorName: string, message: string) {
  if (!resend) { log({ to, subject: "Tutor match" }); return }
  await resend.emails.send({
    from: "J.A.S.S. Tutors <info@jasstutors.com>",
    to,
    subject: "Your tutor match from J.A.S.S.",
    html: `<p>Hi ${parentName},</p>${message || `<p>We've matched you with ${tutorName}. They will be reaching out to you shortly to arrange the first session.</p>`}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`,
  })
}
