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

**IMPORTANT**: After running `prisma db push` or `prisma generate`, the dev server MUST be restarted. These commands kill node.exe to free the Prisma DLL lock. Always chain:
```powershell
taskkill /F /IM node.exe 2>$null; npx prisma db push; if ($?) { npx prisma generate }; Start-Process -FilePath "node_modules\.bin\next.cmd" -ArgumentList "dev" -WindowStyle Normal -PassThru
```
<!-- END:project-setup -->

<!-- BEGIN:troubleshooting -->
# Error Reference

After fixing any bug or error:
1. Add a short `.md` entry in `.opencode/troubleshooting/` with: date, error message, root cause, fix, prevention
2. Reference this folder whenever encountering similar issues
<!-- END:troubleshooting -->

<!-- BEGIN:coding-rules -->
# Data Integrity & Existing Records

Before answering "does X exist" or creating new records/accounts:
1. **Read the seed file** (`prisma/seed.ts`) — it's the source of truth for test data. Over 500 lines. Check it before assuming something doesn't exist.
2. **Check the database** — if unsure, query with `prisma db execute` or read the schema relations.
3. **Never create duplicates** — if a user asks "is there an account for X", verify before creating. Pierre Lavoie (pierre@tutoring.com) is the existing program supervisor.

# Shared Constants

When defining arrays of values used in multiple places (grade levels, categories, contract types):
1. **Put them in `src/lib/constants.ts`** as exported arrays/objects
2. **Import from constants** everywhere — never hardcode the same array twice
3. **Document the structure** with comments explaining what each array represents
4. This prevents mismatches between seed data, UI displays, and business logic
<!-- END:coding-rules -->
