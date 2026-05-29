import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendCareerApplicationEmail(to: string, name: string) {
  if (!resend) {
    console.log(`[EMAIL SKIPPED] Would send career application email to ${to} (${name}) - set RESEND_API_KEY to enable`)
    return
  }

  await resend.emails.send({
    from: "J.A.S.S. Tutors <info@jasstutors.com>",
    to,
    subject: "Thank you for your application — Next Steps",
    html: `
      <p>Hi ${name},</p>
      <p>Thank you for applying to tutor with J.A.S.S.!</p>
      <p>To complete your application, please reply to this email with:</p>
      <ol>
        <li>Your <strong>CV / Resume</strong></li>
        <li>Your <strong>transcript</strong> (unofficial is fine)</li>
      </ol>
      <p>Once we receive these, we'll review your profile and reach out when a matching client is available.</p>
      <p>We look forward to working with you!</p>
      <p>— J.A.S.S. Tutors</p>
    `,
  })
}
