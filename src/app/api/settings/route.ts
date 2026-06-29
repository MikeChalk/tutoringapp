import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isSuperAdmin } from "@/lib/auth-helpers"
import { invalidateEmailTransport } from "@/lib/email"
import { encryptSecret } from "@/lib/secret"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const stripeEnabled = formData.get("stripeEnabled") === "on"
  const smsEnabled = formData.get("smsEnabled") === "on"
  const openaiEnabled = formData.get("openaiEnabled") === "on"
  const emailEnabled = formData.get("emailEnabled") === "on"
  const defaultTaxRate = parseFloat((formData.get("defaultTaxRate") as string) || "0") || 0

  const getString = (key: string) => (formData.get(key) as string)?.trim() || undefined

  // Secret fields: only update if a non-empty value is provided (don't overwrite with blanks)
  const secretFields = {
    twilioSid: getString("twilioSid"),
    twilioToken: getString("twilioToken"),
    openaiKey: getString("openaiKey"),
    stripeKey: getString("stripeKey"),
    resendKey: getString("resendKey"),
    smtpPassword: getString("smtpPassword"),
  }

  const processedSecrets: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(secretFields)) {
    if (value !== undefined && value !== "") {
      processedSecrets[key] = encryptSecret(value)
    }
  }

  const updateData: Record<string, unknown> = {
    name: getString("name"),
    email: getString("email"),
    phone: getString("phone"),
    address: getString("address"),
    website: getString("website"),
    taxNumber: getString("taxNumber"),
    invoicePrefix: getString("invoicePrefix"),
    invoiceNotes: getString("invoiceNotes"),
    defaultTaxRate,
    stripeEnabled, smsEnabled, openaiEnabled, emailEnabled,
    twilioFrom: getString("twilioFrom"),
    smtpHost: getString("smtpHost"),
    smtpPort: (() => { const p = parseInt((formData.get("smtpPort") as string) || "587", 10); return p >= 1 && p <= 65535 ? p : 587 })(),
    smtpUser: getString("smtpUser"),
    ...processedSecrets,
  }

  await prisma.companySettings.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      name: getString("name") || "J.A.S.S. Tutoring",
      email: getString("email") || "",
      phone: getString("phone") || "",
      address: getString("address") || "",
      website: getString("website") || "",
      taxNumber: getString("taxNumber") || "",
      invoicePrefix: getString("invoicePrefix") || "INV-",
      invoiceNotes: getString("invoiceNotes") || "",
      defaultTaxRate,
      stripeEnabled, smsEnabled, openaiEnabled, emailEnabled,
      twilioSid: encryptSecret(secretFields.twilioSid || ""),
      twilioToken: encryptSecret(secretFields.twilioToken || ""),
      twilioFrom: getString("twilioFrom") || "",
      openaiKey: encryptSecret(secretFields.openaiKey || ""),
      stripeKey: encryptSecret(secretFields.stripeKey || ""),
      resendKey: encryptSecret(secretFields.resendKey || ""),
      smtpHost: getString("smtpHost") || "",
      smtpPort: (() => { const p = parseInt((formData.get("smtpPort") as string) || "587", 10); return p >= 1 && p <= 65535 ? p : 587 })(),
      smtpUser: getString("smtpUser") || "",
      smtpPassword: encryptSecret(secretFields.smtpPassword || ""),
    },
    update: updateData,
  })

  invalidateEmailTransport()

  return NextResponse.redirect(new URL("/dashboard/settings?saved=1", request.url), 303)
}