import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "jpg", "jpeg", "png"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function sanitizeName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "-").trim()
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const tutor = await prisma.tutor.findUnique({
    where: { cvToken: token },
    include: { user: { select: { name: true } } },
  })
  if (!tutor) {
    return NextResponse.json({ error: "Invalid or expired upload link." }, { status: 404 })
  }

  const formData = await request.formData()
  const cv = formData.get("cv") as File | null
  const transcript = formData.get("transcript") as File | null

  if (!cv && !transcript) {
    return NextResponse.json({ error: "Please upload at least one file." }, { status: 400 })
  }

  for (const file of [cv, transcript]) {
    if (file && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File "${file.name}" exceeds 10MB limit.` }, { status: 400 })
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || ""
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json({ error: `File type ".${ext}" not allowed. Accepted: ${ALLOWED_EXTENSIONS.join(", ")}.` }, { status: 400 })
      }
    }
  }

  const uploadDir = path.join(process.cwd(), "uploads", token)
  await mkdir(uploadDir, { recursive: true })

  const tutorName = sanitizeName(tutor.user.name)
  const dateStr = new Date().toISOString().split("T")[0]

  const updateData: Record<string, unknown> = {}
  if (tutor.onboardingStep < 1) updateData.onboardingStep = 1

  if (cv && cv.size > 0) {
    const buffer = Buffer.from(await cv.arrayBuffer())
    const ext = cv.name.split(".").pop() || "pdf"
    const diskName = `cv.${ext}`
    const displayName = `${tutorName} - ${dateStr} - CV.${ext}`
    await writeFile(path.join(uploadDir, diskName), buffer)
    updateData.cvUploaded = true
    updateData.cvFilename = displayName
  }

  if (transcript && transcript.size > 0) {
    const buffer = Buffer.from(await transcript.arrayBuffer())
    const ext = transcript.name.split(".").pop() || "pdf"
    const diskName = `transcript.${ext}`
    const displayName = `${tutorName} - ${dateStr} - Transcript.${ext}`
    await writeFile(path.join(uploadDir, diskName), buffer)
    updateData.transcriptUploaded = true
    updateData.transcriptFilename = displayName
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.tutor.update({ where: { id: tutor.id }, data: updateData })
  }

  return NextResponse.redirect(new URL(`/upload/${token}?done=1`, request.url), 303)
}
