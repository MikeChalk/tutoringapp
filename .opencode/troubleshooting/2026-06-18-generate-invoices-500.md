# 2026-06-18 — Generate Invoices 500 (duplicate invoice number)

**Error message**
```
PrismaClientKnownRequestError: Unique constraint failed on the fields: (`number`)
code: 'P2002', meta: { modelName: 'Invoice', target: ['number'] }
at src/app/api/cron/route.ts:46:28
HTTP 500 on POST /api/cron?action=generate
```

**Symptom**: Admin clicks "Generate Invoices" on /dashboard/invoices → `HTTP ERROR 500`.

**Root cause**: `nextInvoiceNumber()` in `src/lib/db.ts` had two bugs:
1. Used `findFirst({ orderBy: { number: "desc" } })` — this is **lexicographic** string sort, not numeric. With mixed-padding numbers in the DB (`INV-001`..`INV-004` alongside `INV-0004`/`INV-0005`), `INV-004` sorts above `INV-0005`, so it computed `num=5` → `next="INV-0005"` which already existed. The 5-attempt retry loop kept re-running the same query and got the same duplicate every time.
2. Fallback line `parseInt(...) || 0 + 1` — operator precedence makes `0 + 1` bind first, so it evaluated as `parseInt(...) || 1`, returning the **same** max number without incrementing → also a duplicate. The fallback could never produce a free number.

The 3-digit invoice numbers (`INV-001` etc.) came from older seed/import data; the 4-digit ones from the padded generator. The string sort couldn't reconcile the two paddings.

**Fix**: Rewrote `nextInvoiceNumber()` to fetch all invoice numbers, compute the true **numeric** max via `reduce` (parsing digits, ignoring non-digit chars and padding), then return `INV-{maxNum+1}` zero-padded to 4. Kept a 5-attempt retry for race-safety (re-checking `findUnique` before returning) with a `Date.now()` last-resort fallback that guarantees uniqueness.

**Prevention**:
- When generating sequential human-readable IDs, never rely on string `ORDER BY` to find the max — parse to a number first, or store a numeric sequence column.
- Watch operator precedence with `||` and `+`: `a || b + c` is `a || (b + c)`, not `(a || b) + c`. Add parens.
- The unique constraint on `Invoice.number` is the correct DB-level guard; the app code just needs to compute the next number correctly.
