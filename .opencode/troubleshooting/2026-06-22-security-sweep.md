# 2026-06-22 — Comprehensive Security & Quality Sweep

## Date
2026-06-22

## Error/Issue
Systematic security audit by 4 review agents revealed 5 Critical, 19 High, 12 Medium, and 7 Low issues across the codebase. The dominant theme was CITY_ADMIN cross-tenant access (isAdmin returns true for both ADMIN and CITY_ADMIN, but most routes never checked city scope).

## Root Cause
The `isAdmin()` helper returns true for both `ADMIN` and `CITY_ADMIN`, but the majority of write routes and detail pages used only `isAdmin` without calling `getCityAccessScope`/`getCityFilter`. This allowed a CITY_ADMIN to read, modify, or delete data in any city.

## Fix
1. **2FA bypass**: `authorize` in auth.ts now returns null for `totpEnabled` users, forcing them through prelogin+verify-2fa flow.
2. **City-scope sweep**: Added `assertInScope()` helper to auth-helpers.ts. Applied scope checks to ~25 API routes and 3 dashboard detail pages.
3. **Super-admin only**: Settings, rates (city creation) now require `isSuperAdmin`.
4. **Rate limiting**: Added `rateLimitByIp` to prelogin, verify-2fa, reset-password, upload/[token].
5. **Open redirect**: Created `safeReferer()` helper; applied to hours routes.
6. **Error leaks**: Replaced `e.message` returns with generic errors in payout, stripe/checkout, stripe/connect, workflows/templates.
7. **Cookie prefix**: Impersonate routes now use `__Secure-` prefix in production.
8. **2FA enable**: Generate route now stores secret in DB; enable route reads from DB instead of accepting client-supplied secret.
9. **cityId validation**: Public endpoints (careers, request-tutor) now validate cityId against City table.
10. **XSS**: workflows-content.tsx renders template body as `<pre>` instead of dangerouslySetInnerHTML. email.ts `render()` now HTML-escapes variable values.
11. **Schema**: Added indexes (HourLog, Invoice, Project, User, etc.), Lead.convertedToClient relation, changed Invoice.client cascade to SetNull, added missing GRADE_LABELS keys, deleted stale migrations directory.

## Prevention
- Any new admin route MUST call `getCityAccessScope` and use `assertInScope` for resource access.
- Use `safeReferer()` for all redirect-from-referer patterns.
- Never return `e.message` to the client; log server-side and return generic error.
- Public endpoints must validate all IDs against the database.
