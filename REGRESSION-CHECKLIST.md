# Regression Checklist — overnight-review merge

All passwords: `password123`

| # | Role / Credentials | Page / Action | What "working" looks like |
|---|---|---|---|
| **DASHBOARD LOADS FOR ALL ROLES** ||||
| 1 | ADMIN — `admin@tutoring.com` | `/dashboard` | Dashboard loads with stats (tutor count, client count, project count, pending invoices, new requests, total hours). No redirect to login. |
| 2 | CITY_ADMIN — `admin@toronto.jasstutors.com` | `/dashboard` | Dashboard loads. Only Toronto stats shown (new requests count, total hours for Toronto). No redirect. |
| 3 | TUTOR — `emma@tutoring.com` | `/dashboard` | Tutor dashboard loads with welcome greeting, "Log a session" card, paid/unpaid earnings, and nav tiles (My Clients, My Projects, etc.). No admin stats. |
| 4 | CLIENT — `robert@email.com` | `/dashboard` | Client dashboard loads showing their own projects and stats. No admin stats, no tutor pay info. |
| **PROJECT LIST — FILTERS, SEARCH, TABS** ||||
| 5 | ADMIN — `admin@tutoring.com` | `/dashboard/projects` | Type tabs visible: "All Projects", "Private Tutoring", "Study Hall Projects". Cities dropdown visible (super admin). Status filter visible. Search bar works — type a project name, results narrow. Grid/list toggle works. Create Project form available. |
| 6 | CITY_ADMIN — `admin@toronto.jasstutors.com` | `/dashboard/projects` | Only Toronto projects shown. City filter NOT visible (city admins don't see the dropdown). Status filter visible. Tabs work. |
| 7 | TUTOR — `emma@tutoring.com` | `/dashboard/projects` | Only assigned, in-progress projects shown. No create button. No city/status filters. No billing columns in list view. |
| 8 | CLIENT — `robert@email.com` | `/dashboard/projects` | Only own projects shown. No create button. No billing columns. No tutor emails. No city/status filters. |
| 9 | ADMIN — `admin@tutoring.com` | `/dashboard/projects` — search | Type a keyword in the search bar. Results filter by project name and client name. Clearing the search restores full list. |
| 10 | ADMIN — `admin@tutoring.com` | `/dashboard/projects` — tabs | Click "Private Tutoring" — only STUDENT projects shown. Click "Study Hall Projects" — only STUDY_HALL shown. Click "All Projects" — all shown. |
| **PROJECT DETAIL — HOURS LOG, TUTOR ASSIGNMENT, EDIT** ||||
| 11 | ADMIN — `admin@tutoring.com` | `/dashboard/projects/[id]` — pick any project | Full detail page: project name, client, grade, city, status badge, subject tags. Edit form visible. Assign tutor dropdown visible. Hours log table shows Date, Tutor, Mode, Hours, Billing, Tutor Pay, Description. Clone button visible. |
| 12 | TUTOR — `emma@tutoring.com` | `/dashboard/projects/[id]` — tutor's assigned project | Detail page loads. No edit form. No assign tutor. No billing column. Tutor Pay column IS visible. No clone button. Hours log shows own sessions. |
| 13 | CLIENT — `robert@email.com` | `/dashboard/projects/[id]` — client's own project | Detail page loads. No edit form. No assign tutor. No billing. No tutor pay. No tutor emails shown. No clone button. |
| 14 | ADMIN — `admin@tutoring.com` | `/dashboard/projects/[id]` — hours log | Hours log table renders with data. Each row shows date, tutor name, mode, hours, billing amount, tutor pay, description. |
| **MOBILE HAMBURGER** ||||
| 15 | Any role | Shrink browser to <768px. Click hamburger icon in header. | Sidebar/drawer opens on first click. Navigation links visible. Can click a link to navigate. **Known issue**: after browser back/forward on `/dashboard/projects`, hamburger may stop responding — refresh fixes it (Next.js #93905). |
| **DARK MODE TOGGLE** ||||
| 16 | Any role | `/dashboard` — click dark mode toggle (sun/moon icon) | Page switches to dark theme. Backgrounds go dark, text goes light. Toggle back restores light theme. |
| **CITY FILTER (SUPER ADMIN)** ||||
| 17 | ADMIN — `admin@tutoring.com` | `/dashboard/projects` — city dropdown | "All Cities" / "Montreal" / "Toronto" dropdown is visible. Selecting a city filters projects. Selecting "All Cities" shows all. |
| 18 | ADMIN — `admin@tutoring.com` | `/dashboard/requests` — city dropdown | City dropdown visible. Selecting "Montreal" shows only Montreal requests. Selecting "Toronto" shows only Toronto. "All Cities" shows all. |
| **STATUS FILTER (ADMIN)** ||||
| 19 | ADMIN — `admin@tutoring.com` | `/dashboard/requests` — status filter | Status dropdown or pills visible (e.g. NEW, MATCHED, etc.). Selecting a status filters requests. |
| 20 | ADMIN — `admin@tutoring.com` | `/dashboard/projects` — status filter | Status filter available. Selecting a status narrows projects. |
| **TUTOR DASHBOARD — OVERVIEW, SESSION FORM, WELCOME** ||||
| 21 | TUTOR — `emma@tutoring.com` | `/dashboard` — welcome section | "Hi, Emma" greeting shows (or brief greeting if previously dismissed). |
| 22 | TUTOR — `emma@tutoring.com` | `/dashboard` — "Log a session" card | TutorSessionForm renders. Can select project type (Private Tutoring / Other Projects). Mode toggle (In Person / Online). Project dropdown populates. Date, hours, and rate display work. Submit creates a session. |
| 23 | TUTOR — `emma@tutoring.com` | `/dashboard` — nav tiles | Tiles visible: My Clients, My Projects, Tutoring Offers, My Payments, My Contract, Settings. Each links to the correct page. |
| **LOGIN PAGE — TOGGLE & SIGN-IN** ||||
| 24 | Any | `/login` — role toggle | Tutor/Client pill toggle visible. Default: Client. Clicking "Tutor" changes submit button to "Sign in as tutor". Clicking "Client" changes back. |
| 25 | TUTOR — `emma@tutoring.com` | `/login` — sign in as tutor | Toggle to "Tutor". Enter email + password. Click "Sign in as tutor". Redirects to `/dashboard`. Dashboard shows tutor view. |
| 26 | CLIENT — `robert@email.com` | `/login` — sign in as client | Toggle on "Client" (default). Enter email + password. Click "Sign in as client". Redirects to `/dashboard`. Dashboard shows client view. |
| **REQUEST FORM — CITY TOGGLE** ||||
| 27 | Any (not logged in) | `/request-tutor` — city toggle | City buttons/pills visible (Montreal, Toronto). Clicking one selects it. If only 1 city exists in DB, auto-selected and hidden. Submitting includes selected cityId. |
| **FEEDBACK BUBBLE** ||||
| 28 | Any role | Click feedback bubble (bottom-right corner). Type a message. Click submit. | Toast/success message appears ("Thank you for your feedback" or similar). No error. No PII in console (previously there was a console.log — confirm it's gone via DevTools console). |