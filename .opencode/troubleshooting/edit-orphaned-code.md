# Edit Leaves Orphaned Code After Partial Replacement

**Date:** 2026-05-29

**Error:** Build fails with `Unexpected token` or `Expected '<'` errors — orphaned JSX from old code remains after the edit.

**Root cause:** When replacing a large block of JSX with new code using `edit`, the old JSX may extend beyond the replaced section. The remaining closing tags and orphaned content break the new structure.

**Fix:** After any large edit, immediately verify with `npx next build`. If build fails, read the file around the error line and manually remove leftover code.

**Prevention:** For large JSX replacements, use `write` tool to rewrite the entire file or the entire component. Only use `edit` for small, targeted replacements. For anything spanning more than 10 lines, prefer rewriting the whole file or the complete section.
