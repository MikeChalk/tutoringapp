import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    { error: "Password reset is not yet available. Contact your administrator for help." },
    { status: 501 }
  )
}
