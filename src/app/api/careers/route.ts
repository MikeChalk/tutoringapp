import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { sendCareerApplicationEmail } from "@/lib/email"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(request: Request) {
  const formData = await request.formData()

  const firstName = (formData.get("firstName") as string)?.trim()
  const lastName = (formData.get("lastName") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const phone = (formData.get("phone") as string)?.trim()
  const cityId = (formData.get("cityId") as string) || null
  const borough = (formData.get("borough") as string)?.trim()
  const currentStudies = (formData.get("currentStudies") as string)?.trim()
  const highSchool = (formData.get("highSchool") as string)?.trim()
  const subjects = (formData.get("subjects") as string)?.trim()
  const formatOnline = formData.get("formatOnline") === "on"
  const formatInPerson = formData.get("formatInPerson") === "on"
  const workExperience = (formData.get("workExperience") as string)?.trim()

  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: "First name, last name, and email are required." }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 })
  }

  const name = `${firstName} ${lastName}`
  const randomPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  const hashed = await bcrypt.hash(randomPassword, 12)
  const cvToken = crypto.randomBytes(16).toString("hex")

  const preferredFormats = []
  if (formatOnline) preferredFormats.push("Online")
  if (formatInPerson) preferredFormats.push("In-Person")

  const bioParts = []
  if (phone) bioParts.push(`Phone: ${phone}`)
  if (borough) bioParts.push(`Borough: ${borough}`)
  if (currentStudies) bioParts.push(`Current Studies: ${currentStudies}`)
  if (highSchool) bioParts.push(`High School: ${highSchool}`)
  if (preferredFormats.length) bioParts.push(`Preferred Format: ${preferredFormats.join(", ")}`)
  if (workExperience) bioParts.push(`Work Experience: ${workExperience}`)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: "TUTOR",
      cityId,
    },
  })

  await prisma.tutor.create({
    data: {
      userId: user.id,
      subjects: subjects || "",
      bio: bioParts.join("\n") || null,
      isActive: true,
      onboarded: false,
      cvToken,
    },
  })

  const uploadUrl = `${request.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000"}/upload/${cvToken}`

  await sendCareerApplicationEmail(email, firstName, uploadUrl)

  return NextResponse.redirect(new URL("/careers?submitted=1", request.url), 303)
}
