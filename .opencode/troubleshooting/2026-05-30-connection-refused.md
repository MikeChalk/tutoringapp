# ERR_CONNECTION_REFUSED on localhost:3000

**Date:** 2026-05-30 (multiple occurrences)

**Error:** Browser shows "Failed to Load Page — ERR_CONNECTION_REFUSED (-102)" when navigating to dashboard pages.

**Root cause:** The Next.js dev server is killed during schema migrations (`taskkill /F /IM node.exe` inside `prisma db push` flow) and not restarted afterward. `prisma db push` kills all Node processes to release file locks on the Prisma client DLL (`query_engine-windows.dll.node`), but the dev server is never brought back up.

**Fix (immediate):** Restart the dev server:
```powershell
Start-Process -FilePath "node_modules\.bin\next.cmd" -ArgumentList "dev" -WindowStyle Normal -PassThru
```
Wait ~6 seconds for compilation, then verify:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
```

**Fix (permanent):** After every `prisma db push` command, always chain the dev server restart:
```powershell
taskkill /F /IM node.exe 2>$null; npx prisma db push; if ($?) { npx prisma generate }; Start-Process -FilePath "node_modules\.bin\next.cmd" -ArgumentList "dev" -WindowStyle Normal -PassThru
```

**Occurrences:**
- 2026-05-30: After adding new Expense/Tutor fields, migrating, forgot restart
- 2026-05-30: After adding EmailLog, Expense-HourLog relations, forgot restart
- 2026-05-30: After most `prisma db push` calls
