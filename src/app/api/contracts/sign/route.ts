import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendOnboardingEmail, sendEmail, hasEmailTransport } from "@/lib/email"
import { generateContractPDF } from "@/lib/contract-pdf"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tutor = await prisma.tutor.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { name: true, email: true } } },
  })

  if (!tutor) {
    return NextResponse.json({ error: "Tutor not found" }, { status: 404 })
  }

  const formData = await request.formData()
  const signatureName = (formData.get("signatureName") as string)?.trim()

  if (!signatureName) {
    return NextResponse.json({ error: "Please type your full name to sign." }, { status: 400 })
  }

  const contract = await prisma.contract.findFirst({
    where: { tutorId: tutor.id, signed: false },
    orderBy: { createdAt: "desc" },
  })

  if (!contract) {
    return NextResponse.json({ error: "No unsigned contract found" }, { status: 404 })
  }

  if (contract.signed) {
    return NextResponse.json({ error: "Already signed" }, { status: 400 })
  }

  const signedAt = new Date()

  await prisma.contract.update({
    where: { id: contract.id },
    data: { signed: true, signedAt, signedByName: signatureName },
  })

  // Onboarding advancement
  if (tutor.onboardingStep === 1) {
    await prisma.tutor.update({
      where: { id: tutor.id },
      data: { onboardingStep: 2 },
    })
  }

  // Fire-and-forget: generate PDF and send email in background
  generateAndSendPdf(contract, tutor, signatureName, signedAt).catch(err => {
    console.error("[contract-sign] Background task failed:", err)
  })

  return NextResponse.redirect(new URL("/dashboard/contract", request.url), 303)
}

async function generateAndSendPdf(
  contract: { id: string; type: string; yearLevel: string; startDate: Date; endDate: Date; terms: string; rates: string },
  tutor: { user: { name: string; email: string } },
  signatureName: string,
  signedAt: Date
) {
  const settings = await prisma.companySettings.findUnique({ where: { id: "main" } })
  let rates: Record<string, number> = {}
  try { rates = JSON.parse(contract.rates || "{}") } catch { /* ignore */ }

  const pdfBuffer = await generateContractPDF({
    tutorName: tutor.user.name,
    tutorEmail: tutor.user.email,
    contractType: contract.type,
    yearLevel: contract.yearLevel,
    startDate: contract.startDate,
    endDate: contract.endDate,
    terms: contract.terms,
    rates,
    signed: true,
    signedAt,
    signedByName: signatureName,
    companyName: settings?.name || undefined,
    companyAddress: settings?.address || undefined,
    companyEmail: settings?.email || undefined,
    companyPhone: settings?.phone || undefined,
  })

  try {
    const companySettings = await prisma.companySettings.findUnique({ where: { id: "main" }, select: { emailEnabled: true } })
    if (companySettings?.emailEnabled !== false && (await hasEmailTransport())) {
      const template = await prisma.emailTemplate.findFirst({
        where: { trigger: "contract_signed" },
      })
      const subject = template?.subject || "Contract Signed — Welcome to J.A.S.S."
      const htmlBody = (template?.htmlBody || "<p>Hi {{name}},</p>{{message}}<p>— J.A.S.S. Tutors</p>")
        .replace("{{name}}", tutor.user.name)
        .replace("{{message}}", "<p>Your signed contract is attached as a PDF. Please keep it for your records. We'll be in touch with the next steps.</p>")

      const pdfBase64 = pdfBuffer.toString("base64")

      await sendEmail({
        from: "J.A.S.S. Tutors <info@jasstutors.com>",
        to: tutor.user.email,
        subject,
        html: htmlBody,
        attachments: [{
          filename: `Contract-${tutor.user.name.replace(/\s/g, "-")}.pdf`,
          content: pdfBase64,
          encoding: "base64",
        }],
      })

      await prisma.emailLog.create({
        data: { to: tutor.user.email, subject, trigger: "contract_signed" },
      }).catch(() => {})
    } else {
      const message = `<p>Your signed contract has been recorded. We'll be in touch with the next steps.</p>`
      await sendOnboardingEmail(tutor.user.email, tutor.user.name, message, "contract_signed").catch(() => {})
    }
  } catch (err) {
    console.error("[contract-sign] Email send failed:", err)
  }
}
