# Duplicate supervisor account created

**Date:** 2026-05-30

**Error:** Created a new supervisor account (`supervisor@tutoring.com`) when one already existed (`pierre@tutoring.com`) in the seed data.

**Root cause:** Did not re-read `prisma/seed.ts` before answering "does a supervisor account exist?" Relied on memory instead of verifying against the source of truth.

**Fix:** Removed the duplicate from seed. Pierre Lavoie (tutor4, pierre@tutoring.com) is the program supervisor — he has a signed PROGRAM_SUPERVISOR contract with year level 3RD_YEAR.

**Prevention:** Before creating any new record or account, always:
1. Read `prisma/seed.ts` to check existing data
2. Query the database if seed doesn't have the answer
3. Never assume something doesn't exist without checking
