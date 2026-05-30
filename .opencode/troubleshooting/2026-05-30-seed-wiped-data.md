# Data wiped by running prisma db seed without warning

**Date:** 2026-05-30

**Error:** Ran `npx prisma db seed` when user asked "can you run it" (referring to a DB update), but the seed command drops and recreates all data. Wiped all custom test data including Pierre's logged hours.

**Root cause:** Used `npx prisma db seed` instead of targeted `prisma db execute` SQL commands. Seed recreates all data from scratch — any custom-created records (hour logs, invoices, etc.) are lost.

**Fix:** Use `prisma db execute --stdin` with targeted UPDATE/INSERT statements for data changes. Never use `prisma db seed` in a working database unless explicitly asked to reset.

**Prevention:** 
- Ask for explicit confirmation before running any command that could delete/modify data
- Use `prisma db execute` for targeted updates
- Never run `prisma db seed` unless user explicitly says "reset the database" or "run seed"
