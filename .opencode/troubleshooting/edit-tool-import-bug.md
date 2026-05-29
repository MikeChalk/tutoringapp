# Edit Tool Replaces Import Lines Accidentally

**Date:** 2026-05-29

**Error:** Using `edit` tool with `oldString` that matches an import line and `newString` that replaces the entire import block — breaks compilation because the replaced import was needed elsewhere.

**Root cause:** The `edit` tool performs exact string replacement. When the old string matches an import (e.g., `import Link from "next/link"`) and new string replaces it with something else, any remaining references to `Link` break.

**Fix:** Always read the full file first to understand all usages of the symbol being replaced. When moving/changing imports, make sure no other references remain.

**Prevention:**
1. Read the entire file before editing
2. Use grep to check for all usages of a symbol before replacing its import
3. When adding a new import, insert it AFTER existing imports instead of replacing one
4. Build after every edit to catch these immediately
