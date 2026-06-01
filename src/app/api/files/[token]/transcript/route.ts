import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import { readdir } from "fs/promises"
import path from "path"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const tutor = await prisma.tutor.findUnique({ where: { cvToken: token }, select: { transcriptFilename: true } })
  if (!tutor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const uploadDir = path.join(process.cwd(), "uploads", token)
  if (!existsSync(uploadDir)) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 404 })
  }

  let filePath: string | null = null
  try {
    const files = await readdir(uploadDir)
    const match = files.find(f => f.startsWith("transcript."))
    if (match) filePath = path.join(uploadDir, match)
  } catch {
    return NextResponse.json({ error: "No files uploaded" }, { status: 404 })
  }

  if (!filePath) {
    return NextResponse.json({ error: "Transcript not uploaded" }, { status: 404 })
  }

  const buffer = await readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
  }
  const contentType = mimeTypes[ext] || "application/octet-stream"
  const filename = tutor.transcriptFilename || `transcript${ext}`

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
    },
  })
}
