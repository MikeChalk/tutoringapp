# Known Issues

## Next.js 16.2.6 — Back/forward navigation freezes client-side interactivity

**Issue:** [vercel/next.js#93905](https://github.com/vercel/next.js/issues/93905) / PR [#94139](https://github.com/vercel/next.js/pull/94139)

After using the browser's back or forward button, client-side JavaScript event handlers (clicks, navigation, forms) may stop responding. The page appears visually restored from cache but is functionally frozen. A full page refresh (F5 / Ctrl+R) always restores interactivity.

This is a confirmed regression in Next.js 16.2.6's client-side router / bfcache handling. The fix PR (#94139) is open but not yet merged.

**Affected routes:** Most noticeably `/dashboard/projects` and `/dashboard/projects/[id]` on mobile (<1024px widths), but can occur on any dashboard route.

**Workaround:** Refresh the page if interactivity is lost after using back/forward navigation.

**DO NOT downgrade to 16.2.5.** Version 16.2.5 is vulnerable to CVE-2026-45109 (middleware/proxy auth bypass on Turbopack), which is patched in 16.2.6. Downgrading would reintroduce a real security vulnerability that is worse than this UX bug. Once #94139 ships in a patch release (16.2.7+), upgrade immediately.

## npm audit — postcss & next (moderate)

**Warnings:** `postcss` (< 8.5.10, XSS) and `next` (depends on vulnerable postcss).

**Deferred** until the planned Next.js upgrade. Fixing these warnings with `npm audit fix --force` would downgrade Next.js past 16.2.6 and reopen CVE-2026-45109, which is a high-severity auth bypass. Both warnings should resolve automatically when we upgrade off 16.2.6 once the bfcache fix (#94139) ships in 16.2.7+.

## Stripe payments — deferred items for implementation phase

These items must be addressed when building the real payment flow. Do NOT act on them now.

- **`/api/stripe/webhook`** — Needs real signature-verification scrutiny when payments go live. Currently trusts the Stripe signature header but should be audited for replay attacks, event ordering, and idempotency before production use.
- **`/api/stripe/connect`** — Tutor-only route. Revisit at payment time to confirm scope and access control when Stripe Connect onboarding flow is fully built.
- **`/api/stripe/checkout`** — Guard is in place (`["SENT", "OVERDUE"]` whitelist, 404 on rejection), but needs real runtime testing when Pay Now is enabled. It's a POST endpoint — not browser-testable via URL bar. Test with actual Stripe test keys and authenticated client sessions before going live.

## CITY_ADMIN can delete hour logs in any city (security, cross-city destructive access)

**Issue:** `/api/hours/[id]` route's `canModify()` (`src/app/api/hours/[id]/route.ts:9`) calls `isAdmin()`, which returns `true` for both `ADMIN` and `CITY_ADMIN`. A CITY_ADMIN can therefore POST `_action=delete` (or `edit`/`pay`) on **any** hour log, including logs in cities other than their own. The delete action is destructive and also cascades to the linked `Expense` row (`route.ts:124`). Ownership is enforced for `TUTOR` (via `log.tutorId === tutorId`), but city scope is not enforced for `CITY_ADMIN`.

**Affected:** `src/app/api/hours/[id]/route.ts` — all actions (`delete`, `edit`, `pay`). Pre-existing; surfaced while reviewing the in-progress DeleteHourButton wiring on `projects/[id]`.

**Workaround:** None — CITY_ADMIN can currently delete/edit/pay hour logs across all cities.

**Fix:** In the city-scoping sweep — gate `CITY_ADMIN` in `canModify()` by resolving the log's city (via `log.project.cityId`) and comparing to the admin's `cityId` (use `getCityAccessScope`), same `none`/`single`/`all` model as Part 1. Destructive cross-city access; fix before any broader city-scoping pass.

## Flash of dashboard before auth redirect (cosmetic, low priority)

When an unauthenticated user loads a `/dashboard` URL directly, the page paints for ~1 frame before the auth guard redirects to login. No data leaks — the guard fires before any real content or query results render; only the empty shell flashes. Behavior is otherwise correct (unauthenticated users are correctly redirected to login).

Fix when convenient: gate the dashboard render on auth state resolving before painting (e.g. server-side auth check / redirect before render, or a loading state until session resolves) so there's no flash. Cosmetic only — does not block release.

## Brief dashboard flash before client welcome overlay (cosmetic, low priority)

On first load of the day, the client dashboard paints for a frame before the navy welcome overlay appears. `useLayoutEffect` (commit 08ba902) reduced it but didn't eliminate it — a client-component overlay can't paint before the server-rendered dashboard hydrates, so a sliver of dashboard shows first.

Real fix (deferred): render the welcome cover server-side or as a CSS-from-first-paint element so it's present before hydration, rather than a client overlay that mounts after. Cosmetic only — overlay shows and dismisses correctly; no data or security impact.