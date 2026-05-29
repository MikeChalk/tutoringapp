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

  await prisma.companySettings.upsert({
    where: { id: "main" },
    create: {
      id: "main",
      name: (formData.get("name") as string) || "J.A.S.S. Tutoring",
      email: (formData.get("email") as string) || "",
      phone: (formData.get("phone") as string) || "",
      address: (formData.get("address") as string) || "",
      website: (formData.get("website") as string) || "",
      taxNumber: (formData.get("taxNumber") as string) || "",
      invoicePrefix: (formData.get("invoicePrefix") as string) || "INV-",
      invoiceNotes: (formData.get("invoiceNotes") as string) || "",
    },
    update: {
      name: (formData.get("name") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      website: (formData.get("website") as string) || undefined,
      taxNumber: (formData.get("taxNumber") as string) || undefined,
      invoicePrefix: (formData.get("invoicePrefix") as string) || undefined,
      invoiceNotes: (formData.get("invoiceNotes") as string) || undefined,
    },
  })

  return NextResponse.redirect(new URL("/dashboard/settings", request.url), 303)
}
