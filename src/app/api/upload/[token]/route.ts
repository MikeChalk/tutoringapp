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

  const updateData: Record<string, unknown> = { onboardingStep: tutor.onboardingStep < 1 ? 1 : undefined }
  if (cv && cv.size > 0) updateData.cvUploaded = true
  if (transcript && transcript.size > 0) updateData.transcriptUploaded = true
  if (updateData.onboardingStep === undefined) delete updateData.onboardingStep

  if (Object.keys(updateData).length > 0) {
    await prisma.tutor.update({
      where: { id: tutor.id },
      data: updateData,
    })
  }

  return NextResponse.redirect(new URL(`/upload/${token}?done=1`, request.url), 303)
}
