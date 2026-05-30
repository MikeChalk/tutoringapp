import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
]

export function proxy(_request: NextRequest) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const response = NextResponse.next()

  for (const { key, value } of securityHeaders) {
    response.headers.set(key, value)
  }

  return response
}

export const config = {
  matcher: [
    { source: "/((?!_next/static|_next/image|favicon.ico).*)" },
  ],
}