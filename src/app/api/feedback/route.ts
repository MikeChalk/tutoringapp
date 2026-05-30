import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await auth()
  const { message } = await request.json()
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 })

  const userInfo = session?.user
    ? `${session.user.name} (${session.user.email}, ${session.user.role})`
    : "Unauthenticated user"

  console.log(`[FEEDBACK] From: ${userInfo}\nMessage: ${message}`)

  // In production: send email via Resend
  // if (process.env.RESEND_API_KEY) {
  //   const { Resend } = await import("resend")
  //   const resend = new Resend(process.env.RESEND_API_KEY)
  //   await resend.emails.send({
  //     from: "J.A.S.S. <info@jasstutors.com>",
  //     to: "admin@tutoring.com",
  //     subject: `Feedback from ${userInfo}`,
  //     text: message,
  //   })
  // }

  return NextResponse.json({ success: true })
}
