# Stripe API Version Invalid

**Date:** 2026-05-29

**Error:** `npm install stripe` works but `npx next build` fails silently or Stripe throws version error.

**Root cause:** Used a future/invalid API version string `"2025-06-30.acacia"` in Stripe constructor. Stripe SDK defaults to the latest stable version if none is specified.

**Fix:** Remove the `apiVersion` parameter entirely — let Stripe SDK use its default version.

```ts
// BEFORE (broken):
new Stripe(key, { apiVersion: "2025-06-30.acacia" as any })

// AFTER (fixed):
new Stripe(key)
```

**Prevention:** Only specify `apiVersion` if you need a specific version. Check Stripe docs for valid version strings.
