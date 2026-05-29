import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const tutor = await prisma.tutor.findUnique({ where: { cvToken: token } })
  if (!tutor) {
    return NextResponse.json({ error: "Invalid or expired upload link." }, { status: 404 })
  }

  const formData = await request.formData()
  const cv = formData.get("cv") as File | null
  const transcript = formData.get("transcript") as File | null

  if (!cv && !transcript) {
    return NextResponse.json({ error: "Please upload at least one file." }, { status: 400 })
  }

  const uploadDir = path.join(process.cwd(), "uploads", token)
  await mkdir(uploadDir, { recursive: true })

  const uploaded: string[] = []

  if (cv && cv.size > 0) {
    const buffer = Buffer.from(await cv.arrayBuffer())
    const ext = cv.name.split(".").pop() || "pdf"
    const filename = `cv.${ext}`
    await writeFile(path.join(uploadDir, filename), buffer)
    uploaded.push(filename)
  }

  if (transcript && transcript.size > 0) {
    const buffer = Buffer.from(await transcript.arrayBuffer())
    const ext = transcript.name.split(".").pop() || "pdf"
    const filename = `transcript.${ext}`
    await writeFile(path.join(uploadDir, filename), buffer)
    uploaded.push(filename)
  }

  const existingBio = tutor.bio || ""
  const note = `\nDocuments uploaded: ${uploaded.join(", ")} on ${new Date().toISOString().split("T")[0]}`
  await prisma.tutor.update({
    where: { id: tutor.id },
    data: { bio: existingBio + note, onboardingStep: 1 },
  })

  return NextResponse.redirect(new URL(`/upload/${token}?done=1`, request.url), 303)
}
