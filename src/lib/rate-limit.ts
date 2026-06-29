const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60_000
const MAX_REQUESTS = 10

export function rateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: entry.resetAt - now }
  }

  entry.count++
  return { allowed: true, retryAfterMs: 0 }
}

export function rateLimitByIp(request: Request): { allowed: boolean; retryAfterMs: number } {
  // The X-Forwarded-For header is client-controlled on the leftmost position.
  // Take the LAST entry (closest to our trusted proxy/server) so a client
  // cannot rotate arbitrary IPs to bypass the limit. If running behind a
  // known multi-hop proxy, append the trusted hop's IP at the end.
  const forwarded = request.headers.get("x-forwarded-for")
  const parts = forwarded?.split(",").map(s => s.trim()).filter(Boolean) || []
  const ip = parts.length > 0 ? parts[parts.length - 1] : "unknown"
  return rateLimit(`ip:${ip}`)
}