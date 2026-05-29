# PowerShell Backtick ($) Escaping in bash Tool

**Date:** 2026-05-29 (multiple occurrences)

**Error:** When running one-liner scripts with `npx tsx -e "..."`, PowerShell interprets `$` followed by text as a variable, causing errors like:
```
The variable '$disconnect' cannot be retrieved because it has not been set.
```

**Root cause:** PowerShell 5.1's `$` prefix for variables conflicts with JavaScript template literals and Prisma's `$disconnect`. Even inside double-quoted strings, `$var` is expanded.

**Fix:** Write the script to a temp file instead of using inline `-e`. Use `Write` tool to create `.ts` files, then run them with `npx tsx path/to/script.ts`.

```powershell
# BROKEN:
npx tsx -e "await p.\$disconnect();"  # PowerShell eats the backtick and tries to resolve $disconnect

# FIXED:
Write file -> npx tsx scripts/my-script.ts
```

**Prevention:** Never use inline TypeScript with `tsx -e` on Windows. Always write to a file first and execute that file.
