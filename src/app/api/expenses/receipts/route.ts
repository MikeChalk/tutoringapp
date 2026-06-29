import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityFilter } from "@/lib/auth-helpers"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

const ALLOWED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"])

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cityFilter = await getCityFilter(session.user.role, session.user.id)

  const { searchParams } = new URL(request.url)
  const filename = searchParams.get("file")
  if (!filename) return NextResponse.json({ error: "Missing file param" }, { status: 400 })

  const ext = path.extname(filename).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
  }

  const safeName = path.basename(filename)

  const expense = await prisma.expense.findFirst({ where: { receiptFileName: safeName, ...cityFilter }, select: { id: true } })
  if (!expense) return NextResponse.json({ error: "File not found" }, { status: 404 })

  const filePath = path.join(process.cwd(), "uploads", "expenses", safeName)

  if (!existsSync(filePath)) return NextResponse.json({ error: "File not found" }, { status: 404 })

  const contentType = MIME_TYPES[ext] || "application/octet-stream"

  const buffer = await readFile(filePath)
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
    },
  })
}
