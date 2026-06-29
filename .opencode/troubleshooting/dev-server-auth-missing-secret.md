# Dev server infinite loop / page constant refresh

**Date:** 2026-06-22
**Error:** `[auth][error] MissingSecret: Please define a secret.` repeated endlessly in dev server output; browser page keeps refreshing (ClientFetchError: There was a problem with the server configuration).

**Root cause:** No `.env` file existed in the project root, so `AUTH_SECRET` / `NEXTAUTH_SECRET` were undefined. Auth.js throws MissingSecret on every request that touches auth; the browser retried the session fetch on a loop, causing the "terminal looping + page refreshing" symptom.

**Fix:** Created `.env` from `.env.example` and generated a real random secret with:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Set both `AUTH_SECRET` and `NEXTAUTH_SECRET` to that value, then restarted `next dev`.

**Prevention:** Never run `next dev` without a `.env` containing `AUTH_SECRET`. If the terminal suddenly starts spamming the same error and the page keeps reloading, check `.env` first. Also remember `C:\Program Files\nodejs` must be on PATH for `npx`/`next` to work.
