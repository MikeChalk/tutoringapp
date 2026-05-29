# Dev Server Connection Refused

**Date:** 2026-05-29 (multiple occurrences)

**Error:** `ERR_CONNECTION_REFUSED (-102)` when accessing `http://localhost:3000`

**Root cause:** The Next.js dev server (`npm run dev`) is a long-running process. When started via bash tool, the process is killed when the shell times out (120s default). Using `cmd.exe /c "npm run dev"` via `System.Diagnostics.Process` is unreliable on Windows.

**Fix:** Start the server by running `node_modules\.bin\next.cmd dev` directly via `Start-Process`:

```powershell
Start-Process -FilePath "node_modules\.bin\next.cmd" -ArgumentList "dev" -WorkingDirectory "$PWD" -WindowStyle Normal -PassThru
```

**Verification:** Wait 5 seconds, then check `netstat -ano | Select-String "LISTENING.*3000"` and `Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10`.

**Prevention:** Always check if the server is already running before trying to start it. If port 3000 is in use, it's already running. If not, use the `Start-Process` with direct `.cmd` approach — avoid `cmd.exe /c` wrapper.
