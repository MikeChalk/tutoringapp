# Edit Inserted Content in Wrong Place

**Date:** 2026-05-29

**Error:** Using `edit` with `oldString` that matches a common pattern (like a closing brace `}`) in `newString` that inserts content — the edit matches the wrong occurrence and inserts text in the middle of a function, breaking syntax.

**Root cause:** The `edit` tool uses exact string matching. When `oldString` is not unique enough (e.g., `\n}\n` or a variable declaration), it can match inside a function body instead of at the file boundary.

**Fix:** 
1. Always include more surrounding context in `oldString` to make it unique
2. For inserts between functions, include the full function signatures on both sides
3. Use `replaceAll` if you're sure the change is identical everywhere

**Example of what went wrong:**
```ts
// Inserting sendClientInviteEmail before sendParentNotificationEmail
// BAD oldString: just the function signature — matched inside a different function
// GOOD oldString: include the previous function's closing + the next function's opening
```

**Prevention:** Include at least 3 lines of context above and below the insertion point. Verify with `grep` that your oldString matches exactly once.
