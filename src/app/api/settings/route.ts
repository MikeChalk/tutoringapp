import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const stripeEnabled = formData.get("stripeEnabled") === "on"
  const smsEnabled = formData.get("smsEnabled") === "on"
  const openaiEnabled = formData.get("openaiEnabled") === "on"
  const emailEnabled = formData.get("emailEnabled") === "on"
  const defaultTaxRate = parseFloat((formData.get("defaultTaxRate") as string) || "0") || 0

  const getString = (key: string) => (formData.get(key) as string)?.trim() || undefined

  const secretFields = {
    twilioSid: getString("twilioSid"),
    twilioToken: getString("twilioToken"),
    twilioFrom: getString("twilioFrom"),
    openaiKey: getString("openaiKey"),
    stripeKey: getString("stripeKey"),
    resendKey: getString("resendKey"),
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
    ...secretFields,
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
      twilioSid: secretFields.twilioSid || "",
      twilioToken: secretFields.twilioToken || "",
      twilioFrom: secretFields.twilioFrom || "",
      openaiKey: secretFields.openaiKey || "",
    },
    update: updateData,
  })

  return NextResponse.redirect(new URL("/dashboard/settings?saved=1", request.url), 303)
}
