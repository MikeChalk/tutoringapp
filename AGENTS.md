<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-setup -->
# Dev Server

This project requires `npm run dev` to be running on port 3000. Before doing any work, check if the dev server is running on `http://localhost:3000`. If it's not running, start it as a detached background process:

```powershell
Start-Process -FilePath "node_modules\.bin\next.cmd" -ArgumentList "dev" -WorkingDirectory "$PWD" -WindowStyle Normal -PassThru
```

Wait 5 seconds, then verify it responds with `Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10`.
<!-- END:project-setup -->

<!-- BEGIN:troubleshooting -->
# Error Reference

After fixing any bug or error:
1. Add a short `.md` entry in `.opencode/troubleshooting/` with: date, error message, root cause, fix, prevention
2. Reference this folder whenever encountering similar issues
<!-- END:troubleshooting -->
