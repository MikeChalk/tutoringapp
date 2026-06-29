# 2026-06-24 — Study Hall invoice generation & redundant supervisor project

## Date
2026-06-24

## Error/Issue
1. "Generate Invoices" generated hourly invoices for Study Hall clients, duplicating the billing path that should run only through Study Hall Cycles registration forms.
2. A separate "Montreal Program Supervisors" project existed in seed data even though supervisors can log hours directly against a school's Study Hall project.
3. A redundant sidebar "Study Hall Projects" entry pointed to `/dashboard/other-projects`, duplicating the project-type toggle already available in the Projects tab.
4. Study Hall cycle cards showed "0 pending / 0 confirmed" — appeared to be a bug but was expected (no registrations submitted).

## Root Cause
- `src/app/api/cron/route.ts` (action=generate) and the legacy auto-invoice branch in `src/app/api/invoices/route.ts` selected ALL unbilled hour logs regardless of project type, so Study Hall hour logs became invoices.
- `prisma/seed.ts` created `sh3` ("Montreal Program Supervisors", `projectType: STUDY_HALL`, `gradeLevel: PROGRAM_SUPERVISOR`). The hours API already maps supervisor grade categories (SUPERVISION, IN_PERSON_MGMT, …) against any `STUDY_HALL` project, so this project was unnecessary.
- The "Study Hall Projects" nav entry in `ADMIN_NAV_SECTIONS` (`constants.ts`) linked to a standalone `other-projects` page that only filtered by `projectType: STUDY_HALL`, which the Projects tab already supports via its type toggle.
- The "0 pending / 0 confirmed" counts are computed from `registrations` with statuses PENDING / CONFIRMED|PAID; the cycle simply had zero registrations.

## Fix
1. `cron/route.ts`: hour-log query now filters `project: { ...cityFilter, projectType: "STUDENT" }` so Study Hall logs are excluded from "Generate Invoices". Logs still become expenses, tutor payouts, and project time logs — only hourly invoicing is skipped.
2. `invoices/route.ts`: legacy single-client auto-invoice branch likewise filters `projectType: "STUDENT"`.
3. `seed.ts`: removed the `sh3` "Montreal Program Supervisors" project block; added a comment explaining supervisors log hours directly to the relevant Study Hall project.
4. `constants.ts`: removed the `{ href: "/dashboard/other-projects", label: "Study Hall Projects" }` nav link; deleted `src/app/dashboard/other-projects/page.tsx`.

## Prevention
- Study Hall billing must flow exclusively through Study Hall Cycles registration forms. Any new "auto-generate invoice from hours" code must exclude `projectType: STUDY_HALL` (equivalently, scope to `STUDENT`).
- Do not create standalone supervisor projects; assign supervisors as `projectTutor`s to the school's Study Hall project and let them log management-category hours there.
- Before adding a new sidebar page, check whether an existing page's filters/toggles already cover it.

---

## 2026-06-26 — Security audit fixes (study hall cycles)

### Completed fixes
- **C1**: `cycle/[slug]/route.ts` no longer leaks discount code strings; returns `discountCodesAvailable: boolean`.
- **C2**: `discounts.ts` — `validateDiscountCode`/`applyDiscountCode` accept optional `cycleId`, enforce `validFrom`/`validUntil`, atomic `usedCount` increment via `applyDiscountCodeTx`.
- **H1**: `rate-limit.ts` uses last entry of X-Forwarded-For (not first) to prevent spoofing.
- **H2**: Register route wraps in `prisma.$transaction` with `nextInvoiceNumberTx` (retry on collision), atomic discount increment, P2002 handling for email race.
- **H3**: Parent uses `signupToken` invite flow (no temp password); invite email sent post-transaction.
- **H4**: Confirm flow requires `cycle.status === "OPEN"`; refreshes signupToken and sends invite if user still pending.
- **H5**: Roster-add gated on `billingModel === "LUMP_SUM_ROSTER"`.
- **M1**: Lump-sum-invoice action gates on LUMP_SUM/LUMP_SUM_ROSTER, includes duplicate-invoice guard (notes marker `[cycle:ID]`), creates line item from confirmed registrations' total sessions × pricePerSession.
- **M2**: Client form refactored — no discount code leakage, neutral input hints, no discount preview.
- **M3**: Dashboard shows subtotal (strikethrough) → discount → totalAmount instead of totalAmount + misleading discount badge.
- **M4**: Update and create routes validate billing model, pricePerSession >= 0, preregistrationDiscount >= 0, earlyBirdPct clamped [0,100], endDate >= startDate.
- **M5**: Registration window (`registrationOpen`/`registrationClose`) enforced in register route.
- **L1**: Email send failures logged via `console.error`.
- **L2**: Free-text fields capped at 5000 chars server-side.
- **L3**: Billing model cannot be changed once registrations exist.
- **L5**: Create route pre-checks `projectId` uniqueness before insert.
- **L6**: `logActivity` added for invoice deletion on cancel.
- **M7**: `nextInvoiceNumber` retries 10× and falls back to sequential (not `Date.now()`).

### Files modified
- `src/app/api/study-hall/cycle/[slug]/route.ts` (C1)
- `src/lib/discounts.ts` (C2)
- `src/lib/rate-limit.ts` (H1)
- `src/lib/db.ts` (M7)
- `src/app/api/study-hall/register/[slug]/route.ts` (C2/H2/H3/M5/L1/L2)
- `src/app/api/study-hall/registrations/[id]/route.ts` (H4/L6)
- `src/app/api/study-hall/cycles/[id]/registrations/route.ts` (H5)
- `src/app/api/study-hall/cycles/[id]/route.ts` (M1/M4/L3 + earlyBirdPct clamp)
- `src/app/api/study-hall/cycles/route.ts` (M4/L5)
- `src/app/study-hall/[slug]/page.tsx` (M2)
- `src/app/dashboard/study-hall/[id]/page.tsx` (M3)
- `src/app/api/cron/route.ts`, `src/app/api/invoices/route.ts` (STUDY_HALL exclusion)
- `prisma/seed.ts`, `src/lib/constants.ts` (supervisor project removal, nav cleanup)