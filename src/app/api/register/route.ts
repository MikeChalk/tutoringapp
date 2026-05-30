import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "Registration is by invitation only." }, { status: 403 })
}
