import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { validateDiscountCode } from "@/lib/discounts"
import { rateLimitByIp } from "@/lib/rate-limit"

export async function POST(request: Request) {
  const { allowed } = rateLimitByIp(request)
  if (!allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })

  const formData = await request.formData()

  const name = (formData.get("name") as string)?.trim()
  const studentName = (formData.get("studentName") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const phone = (formData.get("phone") as string)?.trim()
  const gradeLevel = (formData.get("gradeLevel") as string) || null
  const school = (formData.get("school") as string)?.trim()
  const subject = (formData.get("subject") as string)?.trim()
  const description = (formData.get("description") as string)?.trim()
  const discountCode = (formData.get("discountCode") as string)?.trim() || null
  const address = (formData.get("address") as string)?.trim() || null
  const formCityId = (formData.get("cityId") as string)?.trim() || null
  const prefInPerson = formData.get("prefInPerson") === "on"
  const prefOnline = formData.get("prefOnline") === "on"

  let tutoringPreference: string | null = null
  if (prefInPerson && prefOnline) tutoringPreference = "Both"
  else if (prefInPerson) tutoringPreference = "In-Person"
  else if (prefOnline) tutoringPreference = "Online"

  if (!name || !email || !phone) {
    return NextResponse.json({ error: "Parent name, email, and phone are required." }, { status: 400 })
  }

  let cityId: string | null = null
  if (formCityId) {
    const city = await prisma.city.findUnique({ where: { id: formCityId } })
    if (!city) {
      return NextResponse.json({ error: "Invalid city selection." }, { status: 400 })
    }
    cityId = city.id
  }

  // Build a descriptive subject from selected subjects
  const subjectField = subject || "General tutoring"

  // Validate discount code
  let validDiscountCode: string | null = null
  if (discountCode) {
    const result = await validateDiscountCode(discountCode)
    if (result.valid) {
      validDiscountCode = discountCode.toUpperCase()
    }
  }

  // Build description with all details
  const parts: string[] = []
  if (studentName) parts.push(`Student: ${studentName}`)
  if (gradeLevel) parts.push(`Grade: ${gradeLevel}`)
  if (school) parts.push(`School: ${school}`)
  if (tutoringPreference) parts.push(`Preference: ${tutoringPreference}`)
  if (address) parts.push(`Address: ${address}`)
  if (validDiscountCode) parts.push(`Discount Code: ${validDiscountCode}`)
  else if (discountCode) parts.push(`Discount Code (invalid): ${discountCode}`)
  if (description) parts.push(`Details: ${description}`)

  const fullDescription = parts.join("\n")

  // Auto-link to existing client or lead
  const existingUser = await prisma.user.findUnique({ where: { email }, include: { client: true } })
  const existingClient = existingUser?.client || null
  const existingLead = await prisma.lead.findFirst({ where: { email } })

  await prisma.tutoringRequest.create({
    data: {
      name,
      email,
      phone: phone || null,
      subject: subjectField,
      description: fullDescription || null,
      studentName: studentName || null,
      gradeLevel,
      school: school || null,
      tutoringPreference,
      address,
      discountCode: validDiscountCode,
      clientId: existingClient?.id || null,
      cityId: cityId || null,
      status: "NEW",
    },
  })

  // Update or create lead
  if (existingLead) {
    await prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        name,
        phone: phone || null,
        subject: subjectField,
        notes: fullDescription || null,
        ...(existingClient ? { convertedToClientId: existingClient.id, status: "CONVERTED" } : { status: "CONTACTED" }),
      },
    })
  } else {
    await prisma.lead.create({
      data: {
        name,
        email,
        phone: phone || null,
        subject: subjectField,
        notes: fullDescription || null,
        status: existingClient ? "CONVERTED" : "NEW",
        ...(existingClient ? { convertedToClientId: existingClient.id } : {}),
      },
    })
  }

  return NextResponse.redirect(new URL("/request-tutor?submitted=1", request.url), 303)
}
