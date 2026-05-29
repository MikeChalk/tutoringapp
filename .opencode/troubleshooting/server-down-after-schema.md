# Server Down After Schema Push

**Date:** 2026-05-29

**Error:** `ERR_CONNECTION_REFUSED (-102)` — dev server not running after Prisma schema changes.

**Root cause:** `npx prisma db push` requires stopping the dev server (it locks `.node` Prisma client files). After the push completes, the server was not restarted. The schema change flow is: stop server → push schema → **must restart server**.

**Fix:** Always restart the server immediately after every schema push:
```powershell
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
npx prisma db push --accept-data-loss
# RESTART REQUIRED:
Start-Process -FilePath "node_modules\.bin\next.cmd" -ArgumentList "dev" -WorkingDirectory "$PWD" -WindowStyle Normal -PassThru
```

**Prevention:** Never end a schema change step without verifying the server is running. Check with `netstat -ano | Select-String "3000"` after restart.
