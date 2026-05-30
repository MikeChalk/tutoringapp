import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { isAdmin } from "@/lib/auth-helpers"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filename = searchParams.get("file")
  if (!filename) return NextResponse.json({ error: "Missing file param" }, { status: 400 })

  const filePath = path.join(process.cwd(), "uploads", "expenses", filename)
  if (!existsSync(filePath)) return NextResponse.json({ error: "File not found" }, { status: 404 })

  const ext = path.extname(filename).toLowerCase()
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
  }
  const contentType = mimeTypes[ext] || "application/octet-stream"

  const buffer = await readFile(filePath)
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  })
}
