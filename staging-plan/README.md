# Staging Migration Plan

## Database Setup

Two databases:
- `prisma/dev.db` — development/testing (seed data)
- `prisma/staging.db` — staging environment (migration target)

Switch between them by copying the appropriate `.env` file:
```
cp .env.staging .env   # work in staging
cp .env.dev .env       # work in development
```

Both `.env.dev` and `.env.staging` are gitignored and pre-configured.
Both `.db` files are gitignored.

## Migration Order

| Step | Type | Import Tab | Status |
|------|------|-----------|--------|
| 1 | Clients | `/dashboard/import?tab=clients` | ✅ Complete |
| 2 | Team Members | `/dashboard/import?tab=team` | ✅ Complete |
| 3 | Projects | `/dashboard/import?tab=projects` | ✅ Complete |
| 4 | Invoices | `/dashboard/import?tab=invoices` | ⏳ Deferred (finish school year first) |

## CSV Formats

### Clients
```
first_name, last_name, email, type, company, phone, address, city, province, country, postal_code, notes, created_at
```
- `first_name` + `last_name` (or single `name` column)
- `type`: PARENT or SCHOOL
- `created_at`: YYYY-MM-DD

### Team Members (Tutors)
```
first_name, last_name, email, tenure, role, subjects, grade_levels, phone, city, created_at
```
- `role`: TUTOR (default) or CITY_ADMIN
- `tenure`: 1ST_YEAR, 2ND_YEAR, 3RD_YEAR
- All imported tutors start at onboarding step 0 (onboarded: false)

### Projects
```
student_name, client_email, grade_level, subjects, description, project_type, school, status, city, created_at
```
- Name auto-generated: `"StudentName - Grade (ParentName)"`
- Study hall: `"SchoolName - Study Hall"` or `"StudentName - Study Hall"`
- `project_type`: STUDENT (default) or STUDY_HALL (also accepts "STUDY HALL", "study-hall")
- Default status: ON_HOLD
- No tutor assignments on import
- `description` saved as project notes (does not override name)

### Invoices (deferred)
```
client_email, description, hours, rate, amount, status, due_date, created_at, paid_date
```
- `client_email` must match existing client
- `status`: DRAFT (default), SENT, PAID, OVERDUE
- `paid_date`: only used when status is PAID

## Import Features
- **Tab/CSV detection**: auto-detects tab-separated and comma-separated files
- **Preview step**: shows resolved values and issues before import
- **Row selection**: check/uncheck individual rows
- **Loading overlay**: prevents accidental cancellation during import
- **`created_at` support**: all types support date override (except expenses, where `date` serves as the accounting date)

## Post-Migration Manual Steps

1. Advance tutors through onboarding (assign contracts, match to projects)
2. Change project statuses from ON_HOLD to IN_PROGRESS as tutors are assigned
3. Configure billing rates and pay scales
4. Import invoices (after school year ends)
5. Verify data integrity via `/dashboard/data-health`
6. Promote staging → production: copy `staging.db` to `dev.db`

## Key Settings for Migration
- **Disable emails**: Settings → uncheck "Enable outgoing emails" (prevents spam during bulk imports)
- **Grade advancement**: `/dashboard/data-health` → "Advance All Grades" button (run each summer)

## Production Cutover
When ready:
1. Switch to staging: `cp .env.staging .env`
2. Import invoices
3. Final verification
4. Copy `prisma/staging.db` → `prisma/dev.db`
5. Switch to dev: `cp .env.dev .env`
6. Deploy
