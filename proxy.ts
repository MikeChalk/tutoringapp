import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function proxy() {
  const session = await auth()
  const isLoggedIn = !!session?.user

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", "http://localhost:3000"))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
