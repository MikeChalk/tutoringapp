# reCAPTCHA + 2FA Implementation

**Date:** 2026-05-30
**Feature:** Added reCAPTCHA v2 and TOTP two-factor authentication to login flow

## reCAPTCHA
- Added `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY` env vars
- When keys are empty or placeholder values (length <= 10), reCAPTCHA is **skipped entirely**
- To enable in production, register at https://www.google.com/recaptcha/admin and set both keys in `.env`
- Login page conditionally renders the reCAPTCHA widget only when real keys are configured
- Server-side verification in `/api/auth/prelogin` via `src/lib/recaptcha.ts` helper

## 2FA (TOTP)
- Added `totpSecret` and `totpEnabled` fields to User model in Prisma schema
- New API routes:
  - `POST /api/auth/prelogin` — verifies credentials + reCAPTCHA, returns session or 2FA temp token
  - `POST /api/auth/verify-2fa` — verifies TOTP code + temp token, creates Auth.js session
  - `POST /api/settings/2fa/generate` — generates TOTP secret for QR code
  - `POST /api/settings/2fa/enable` — enables 2FA after verifying a code
  - `POST /api/settings/2fa/disable` — disables 2FA after verifying password
- New pages:
  - `/login` — updated with reCAPTCHA widget and prelogin flow
  - `/login/2fa` — TOTP code entry page
- `Manage2FA` component in settings page for enabling/disabling 2FA
- QR code uses external API (api.qrserver.com) — no `qrcode` npm dependency needed at runtime
- Session creation uses `encode()` from `next-auth/jwt` with salt `authjs.session-token`

## Login Flow
1. User submits email + password on `/login`
2. Client calls `/api/auth/prelogin` (with optional reCAPTCHA token)
3. If 2FA disabled → session cookie set, redirect to `/dashboard`
4. If 2FA enabled → temp JWT (5 min expiry) returned, redirect to `/login/2fa`
5. User enters TOTP code on `/login/2fa`
6. Client calls `/api/auth/verify-2fa` with temp token + code
7. If valid → session cookie set, redirect to `/dashboard`

## Key Files
- `src/lib/recaptcha.ts` — reCAPTCHA verification helper
- `src/app/api/auth/prelogin/route.ts` — login endpoint
- `src/app/api/auth/verify-2fa/route.ts` — 2FA verification endpoint
- `src/app/api/settings/2fa/generate/route.ts` — TOTP secret generation
- `src/app/api/settings/2fa/enable/route.ts` — enable 2FA
- `src/app/api/settings/2fa/disable/route.ts` — disable 2FA
- `src/app/(auth)/login/page.tsx` — login page with reCAPTCHA
- `src/app/(auth)/login/2fa/page.tsx` — 2FA verification page
- `src/components/manage-2fa.tsx` — 2FA management UI component