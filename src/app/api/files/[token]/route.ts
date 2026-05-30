import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { existsSync } from "fs"
import path from "path"

async function findFile(dir: string, prefix: string): Promise<string | null> {
  const { readdir } = await import("fs/promises")
  try {
    const files = await readdir(dir)
    const match = files.find(f => f.startsWith(prefix))
    return match ? path.join(dir, match) : null
  } catch {
    return null
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const tutor = await prisma.tutor.findUnique({ where: { cvToken: token } })
  if (!tutor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const uploadDir = path.join(process.cwd(), "uploads", token)
  if (!existsSync(uploadDir)) {
    return NextResponse.json({ cv: false, transcript: false })
  }

  const cvPath = await findFile(uploadDir, "cv")
  const transcriptPath = await findFile(uploadDir, "transcript")

  return NextResponse.json({
    cv: !!cvPath,
    transcript: !!transcriptPath,
  })
}
