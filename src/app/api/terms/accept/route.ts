import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const client = await prisma.client.findUnique({ where: { userId: session.user.id } })
  if (!client) {
    return NextResponse.json({ error: "Client record not found" }, { status: 404 })
  }

  await prisma.client.update({
    where: { id: client.id },
    data: { tosAccepted: true, tosAcceptedAt: new Date() },
  })

  return NextResponse.redirect(new URL("/dashboard/contract", request.url), 303)
}
