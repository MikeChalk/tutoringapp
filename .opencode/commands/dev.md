---
description: Start the Next.js dev server
agent: build
---

The user wants to start the Next.js development server.

Start it as a detached background process so it persists after this conversation:

Use this PowerShell command:
```powershell
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cmd.exe"
$psi.Arguments = "/c `"npm run dev`""
$psi.WorkingDirectory = "$PWD"
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$proc = [System.Diagnostics.Process]::Start($psi)
Write-Output "PID: $($proc.Id)"
```

After starting, verify it's running by checking `netstat -ano | Select-String "3000"` then test with `Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10`.

If port 3000 is already in use, tell the user the server is already running.
