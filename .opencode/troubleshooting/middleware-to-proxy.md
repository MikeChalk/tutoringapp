# Middleware → Proxy migration

**Date:** 2026-05-30
**Error:** Next.js 16 deprecation warning: "The 'middleware' file convention is deprecated. Please use 'proxy' instead."
**Root cause:** Next.js 16 renamed `middleware.ts` → `proxy.ts` and the `middleware()` export → `proxy()`
**Fix:** Ran `npx @next/codemod@canary middleware-to-proxy .` which renamed the file and function. Deleted the old `src/middleware.ts`. Added `// eslint-disable-line @typescript-eslint/no-unused-vars` to the `_request` parameter since the proxy doesn't inspect the request (it only adds security headers).
**Prevention:** Use `proxy.ts` convention for new Next.js 16 apps.