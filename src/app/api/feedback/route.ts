import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sendOnboardingEmail } from "@/lib/email"
import { rateLimitByIp } from "@/lib/rate-limit"

export async function POST(request: Request) {
  const { allowed } = rateLimitByIp(request)
  if (!allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
  const session = await auth()
  const { name, email, message } = await request.json()
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 })

  const senderName = name || session?.user?.name || "Anonymous"
  const senderEmail = email || session?.user?.email || "unknown@email.com"

  console.log(`[FEEDBACK] From: ${senderName} <${senderEmail}>\nMessage: ${message}`)

  // Send to admin
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend")
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: "J.A.S.S. <info@jasstutors.com>",
        to: "info@jasstutors.com",
        replyTo: senderEmail,
        subject: `Feedback from ${senderName}`,
        text: `From: ${senderName} (${senderEmail})\n\n${message}`,
      })
    } catch { /* email failed silently */ }
  }

  // Send confirmation to the user
  if (senderEmail) {
    const escaped = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
    const confirmMsg = `<p>Here&apos;s a copy of your message:</p><p style="background:#f4f4f4;padding:12px;border-radius:8px;margin:12px 0">${escaped.replace(/\n/g, "<br>")}</p>`
    await sendOnboardingEmail(senderEmail, senderName, confirmMsg, "feedback_received")
  }

  return NextResponse.json({ success: true })
}
