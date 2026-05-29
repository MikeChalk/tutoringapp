# Prisma Schema Migration on Windows

**Date:** 2026-05-29 (multiple occurrences)

**Error:** 
1. `prisma migrate dev` fails with "non-interactive environment" error
2. `prisma db push` fails because dev server locks Prisma client files
3. Schema changes require `--accept-data-loss` flag

**Root cause:**
1. `migrate dev` requires interactive terminal — not available in bash tool
2. The dev server (`next dev`) holds Prisma client `.node` files open, preventing regeneration
3. Column renames/drops in SQLite require explicit data loss acceptance

**Fix:**
```powershell
# 1. Stop dev server
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. Push schema (use --accept-data-loss if dropping/renaming columns)
npx prisma db push --accept-data-loss

# 3. Start dev server
Start-Process -FilePath "node_modules\.bin\next.cmd" -ArgumentList "dev" -WorkingDirectory "$PWD" -WindowStyle Normal -PassThru
```

**Prevention:** Always stop the dev server before schema changes. Use `db push` not `migrate dev` in automated contexts.
