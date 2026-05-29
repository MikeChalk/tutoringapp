import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendCareerApplicationEmail(to: string, name: string, uploadUrl: string) {
  if (!resend) {
    console.log(`[EMAIL SKIPPED] Would send career application email to ${to} (${name}) - upload: ${uploadUrl}`)
    return
  }

  await resend.emails.send({
    from: "J.A.S.S. Tutors <info@jasstutors.com>",
    to,
    subject: "Thank you for your application — Next Steps",
    html: `
      <p>Hi ${name},</p>
      <p>Thank you for applying to tutor with J.A.S.S.!</p>
      <p>To complete your application, please upload your documents here:</p>
      <p style="margin:16px 0">
        <a href="${uploadUrl}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">
          Upload CV & Transcript
        </a>
      </p>
      <p>Please upload:</p>
      <ol>
        <li>Your <strong>CV / Resume</strong></li>
        <li>Your <strong>transcript</strong> (unofficial is fine)</li>
      </ol>
      <p>You can also paste this link in your browser:</p>
      <p style="color:#6b7280;font-size:14px">${uploadUrl}</p>
      <p>Once we receive these, we'll review your profile and reach out when a matching client is available.</p>
      <p>We look forward to working with you!</p>
      <p>— J.A.S.S. Tutors</p>
    `,
  })
}
