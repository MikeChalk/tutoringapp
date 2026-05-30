# ERR_CONNECTION_REFUSED on localhost:3000

**Date:** 2026-05-30

**Error:** Browser shows "Failed to Load Page — ERR_CONNECTION_REFUSED (-102)" when navigating to dashboard pages (e.g., `/dashboard/invoices?generated=2`).

**Root cause:** The Next.js dev server was killed during schema migrations (`taskkill /F /IM node.exe`) and not restarted afterward. The `prisma db push` command kills all Node processes to release file locks on the Prisma client DLL, but the dev server was never brought back up.

**Fix:** Restart the dev server:
```powershell
Start-Process -FilePath "node_modules\.bin\next.cmd" -ArgumentList "dev" -WindowStyle Normal -PassThru
```
Wait ~6 seconds for compilation, then verify with:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
```
Should return HTTP 200.

**Prevention:** After any `prisma db push` or `prisma generate` that requires killing node processes, always restart the dev server as the last step. Add a check at the end of migration scripts.
