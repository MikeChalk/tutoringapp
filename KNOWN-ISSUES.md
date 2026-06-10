# Known Issues

## Next.js 16.2.6 — Back/forward navigation freezes client-side interactivity

**Issue:** [vercel/next.js#93905](https://github.com/vercel/next.js/issues/93905) / PR [#94139](https://github.com/vercel/next.js/pull/94139)

After using the browser's back or forward button, client-side JavaScript event handlers (clicks, navigation, forms) may stop responding. The page appears visually restored from cache but is functionally frozen. A full page refresh (F5 / Ctrl+R) always restores interactivity.

This is a confirmed regression in Next.js 16.2.6's client-side router / bfcache handling. The fix PR (#94139) is open but not yet merged.

**Affected routes:** Most noticeably `/dashboard/projects` and `/dashboard/projects/[id]` on mobile (<1024px widths), but can occur on any dashboard route.

**Workaround:** Refresh the page if interactivity is lost after using back/forward navigation.

**DO NOT downgrade to 16.2.5.** Version 16.2.5 is vulnerable to CVE-2026-45109 (middleware/proxy auth bypass on Turbopack), which is patched in 16.2.6. Downgrading would reintroduce a real security vulnerability that is worse than this UX bug. Once #94139 ships in a patch release (16.2.7+), upgrade immediately.