import crypto from "crypto"

const PREFIX = "enc:v1:"
const ALGO = "aes-256-gcm"
const IV_LEN = 12
const TAG_LEN = 16

function getKey(): Buffer | null {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) return null
  return crypto.scryptSync(secret, "jass-tutors-secrets", 32)
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) return ""
  const key = getKey()
  if (!key) return plaintext

  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, encrypted, tag]).toString("base64")
}

export function decryptSecret(value: string): string {
  if (!value || !value.startsWith(PREFIX)) return value

  const key = getKey()
  if (!key) return ""

  try {
    const raw = Buffer.from(value.slice(PREFIX.length), "base64")
    const iv = raw.subarray(0, IV_LEN)
    const tag = raw.subarray(raw.length - TAG_LEN)
    const ciphertext = raw.subarray(IV_LEN, raw.length - TAG_LEN)
    const decipher = crypto.createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
  } catch {
    return ""
  }
}

export function isEncrypted(value: string): boolean {
  return !!value && value.startsWith(PREFIX)
}
