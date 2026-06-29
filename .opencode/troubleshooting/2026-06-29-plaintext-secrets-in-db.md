# 2026-06-29 — Secrets at rest were plaintext in SQLite

## Error
All API keys (Stripe, OpenAI, Twilio, Resend, SMTP password) were stored as cleartext in the `company_settings` table. If the DB file was exfiltrated, all credentials leaked.

## Root cause
No encryption layer existed between Prisma and the DB for secret fields. The schema stored them as plain `String @default("")`.

## Fix
- Created `src/lib/secret.ts` with AES-256-GCM encrypt/decrypt using a key derived from `AUTH_SECRET` via `scryptSync`.
- Encrypted values are prefixed with `enc:v1:` so `decryptSecret()` can detect them.
- `settings/route.ts` encrypts all secrets before writing to DB.
- `email.ts` decrypts `smtpPassword` and `resendKey` when reading from DB.
- Settings page unchanged — it only checks truthiness for placeholder display, and encrypted strings are truthy.
- Backward compatible: `decryptSecret()` returns plaintext as-is if no `enc:` prefix, so existing values work until re-saved.

## Prevention
- Any new secret field added to `CompanySettings` must be encrypted in `settings/route.ts` and decrypted at read time.
- Never log decrypted secret values.
- If `AUTH_SECRET` is rotated, all encrypted secrets become undecryptable and must be re-entered.
