import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await auth()
  const { name, email, message } = await request.json()
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 })

  const senderName = name || session?.user?.name || "Anonymous"
  const senderEmail = email || session?.user?.email || "unknown@email.com"

  console.log(`[FEEDBACK] From: ${senderName} <${senderEmail}>\nMessage: ${message}`)

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

  return NextResponse.json({ success: true })
}
