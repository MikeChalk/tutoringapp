const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || ""

export function isRecaptchaConfigured(): boolean {
  return !!RECAPTCHA_SECRET && RECAPTCHA_SECRET.length > 10
}

export async function verifyRecaptcha(token: string): Promise<boolean> {
  if (!isRecaptchaConfigured()) return true
  if (!token) return false
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${RECAPTCHA_SECRET}&response=${token}`,
    })
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}