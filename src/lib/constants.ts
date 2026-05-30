export const GRADE_LABELS: Record<string, string> = {
  ELEMENTARY: "Elementary",
  SEC1_2: "SEC 1-2",
  SEC3: "SEC 3",
  SEC4_5: "SEC 4-5",
  CEGEP: "CEGEP",
  UNI: "UNIVERSITY",
  STUDY_HALL_TUTOR: "Study Hall Tutor",
  IN_PERSON_MGMT: "In-Person Mgmt",
  ONLINE_MGMT: "Online Mgmt",
  SUPERVISION: "Supervision",
  MARKETING: "Marketing",
}

// Category sets for the Log Hours form
// Private Tutoring (7 categories): all student grades + Study Hall Tutor
export const PRIVATE_TUTORING_CATEGORIES = ["ELEMENTARY", "SEC1_2", "SEC3", "SEC4_5", "CEGEP", "UNI", "STUDY_HALL_TUTOR"]
// Program Supervisor (11 = 7 tutoring + 4 management)
export const PROGRAM_SUPERVISOR_CATEGORIES = [
  "ELEMENTARY", "SEC1_2", "SEC3", "SEC4_5", "CEGEP", "UNI", "STUDY_HALL_TUTOR",
  "IN_PERSON_MGMT", "ONLINE_MGMT", "SUPERVISION", "MARKETING",
]

// Rate structure:
// PRIVATE_TUTORING: ELEMENTARY → UNI (student rates)
// STUDY_HALL_TUTOR: STUDY_HALL_TUTOR (shared between tutors and supervisors)
// PROGRAM_SUPERVISOR: IN_PERSON_MGMT, ONLINE_MGMT, SUPERVISION, MARKETING
export const STUDENT_GRADES = ["ELEMENTARY", "SEC1_2", "SEC3", "SEC4_5", "CEGEP", "UNI"]
export const GRADE_ADVANCE: Record<string, string | null> = {
  ELEMENTARY: "SEC1_2",
  SEC1_2: "SEC3",
  SEC3: "SEC4_5",
  SEC4_5: "CEGEP",
  CEGEP: null,
  UNI: null,
}
export const TUTOR_STUDY_HALL_GRADES = ["STUDY_HALL_TUTOR"]
export const SUPERVISOR_GRADES = ["STUDY_HALL_TUTOR", "IN_PERSON_MGMT", "ONLINE_MGMT", "SUPERVISION", "MARKETING"]

export const TENURE_LABELS: Record<string, string> = {
  "1ST_YEAR": "Year 1",
  "2ND_YEAR": "Year 2",
  "3RD_YEAR": "Year 3+",
}

export const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  FINISHED: "Finished",
  CANCELLED: "Cancelled",
}

export const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ON_HOLD: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  FINISHED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  PRIVATE_TUTORING: "Private Tutoring",
  STUDY_HALL: "Study Hall",
  PROGRAM_SUPERVISOR: "Program Supervisor",
}

export const CLIENT_TYPE_LABELS: Record<string, string> = {
  PARENT: "Parent",
  SCHOOL: "School",
}

export const STUDENT_GRADE_OPTIONS: Record<string, string> = {
  ELEMENTARY: "Elementary",
  SEC1_2: "Sec 1-2",
  SEC3: "Sec 3",
  SEC4_5: "Sec 4-5",
  CEGEP: "CEGEP",
  UNI: "University",
}

export const SUBJECT_OPTIONS = [
  "Math",
  "English",
  "French",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "Computer Science",
]

export const USER_ROLES = ["ADMIN", "CITY_ADMIN", "TUTOR", "CLIENT"] as const
export type UserRole = (typeof USER_ROLES)[number]

export const CONTRACT_TYPES = ["PRIVATE_TUTORING", "STUDY_HALL", "PROGRAM_SUPERVISOR"] as const
export type ContractType = (typeof CONTRACT_TYPES)[number]

export const PROJECT_TYPES = ["STUDENT", "STUDY_HALL"] as const
export type ProjectType = (typeof PROJECT_TYPES)[number]

export const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE"] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const TENURE_VALUES = ["1ST_YEAR", "2ND_YEAR", "3RD_YEAR"] as const
export type TenureValue = (typeof TENURE_VALUES)[number]

export const HOUR_LOG_MODES = ["IN_PERSON", "ONLINE"] as const
export type HourLogMode = (typeof HOUR_LOG_MODES)[number]

export const EXPENSE_CATEGORIES = ["TUTOR_PAY", "MATERIALS", "TRAVEL", "SOFTWARE", "RENT", "MARKETING", "OFFICE", "OTHER"] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const LEAD_STATUSES = ["NEW", "CONTACTED", "CONVERTED"] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const REQUEST_STATUSES = ["NEW", "MATCHED", "ACCEPTED", "REJECTED"] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

export const PROJECT_STATUSES = ["IN_PROGRESS", "ON_HOLD", "FINISHED", "CANCELLED"] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const CLIENT_TYPES = ["PARENT", "SCHOOL"] as const
export type ClientType = (typeof CLIENT_TYPES)[number]

export const ONBOARDING_STEPS = [
  "Email sent to tutor",
  "Contract signed",
  "Email sent to parent",
  "Project created",
  "Tutor assigned to project",
  "Tutor contacts client",
  "Platform onboarding complete",
] as const

export function getTenureLabel(tenure: string): string {
  return TENURE_LABELS[tenure] || tenure
}

export function getGradeLabel(grade: string): string {
  return GRADE_LABELS[grade] || grade
}

export interface EmailTrigger {
  value: string
  label: string
  step: string
  description: string
  vars: string[]
}

export const EMAIL_TRIGGERS: EmailTrigger[] = [
  {
    value: "career_application",
    label: "Tutor applies via Careers page",
    step: "Application — Step 1",
    description: "Sent automatically when a tutor submits the careers application form. Contains the CV & Transcript upload link.",
    vars: ["name", "uploadUrl"],
  },
  {
    value: "onboarding_welcome",
    label: "Admin advances tutor to onboarding",
    step: "Onboarding — Step 2",
    description: "Sent when an admin moves a tutor from the waitlist into onboarding step 1. Welcomes the tutor and explains next steps.",
    vars: ["name", "message"],
  },
  {
    value: "contract_signed",
    label: "Tutor signs their contract",
    step: "Onboarding — Step 3",
    description: "Sent automatically when a tutor signs their J.A.S.S. contract. Confirms receipt and guides next steps.",
    vars: ["name", "message"],
  },
  {
    value: "parent_tutor_match",
    label: "Parent notified of tutor match",
    step: "Onboarding — Step 4",
    description: "Sent when an admin advances onboarding to step 3. Notifies a parent that a tutor has been matched to their child.",
    vars: ["parentName", "tutorName", "message"],
  },
  {
    value: "client_invite",
    label: "New client account created",
    step: "Client — Account Setup",
    description: "Sent when a new client account is created. Contains the invite link for account setup and invoice access.",
    vars: ["name", "inviteUrl"],
  },
  {
    value: "payment_received",
    label: "Payment received from client",
    step: "Finance — Payment Confirmation",
    description: "Sent when an invoice is marked as paid or a Stripe payment is completed. Thanks the client for their payment and links to the invoice.",
    vars: ["name", "inviteUrl"],
  },
  {
    value: "invoice_reminder",
    label: "Unpaid invoice reminder",
    step: "Finance — Automated Reminder",
    description: "Sent by the automated system (cron job) to remind clients about outstanding invoices.",
    vars: ["name", "inviteUrl"],
  },
  {
    value: "tutor_assigned",
    label: "Tutor assigned to project",
    step: "Onboarding — Step 5",
    description: "Sent when a tutor is assigned to a project. Notifies the tutor they have a new student.",
    vars: ["name", "message"],
  },
  {
    value: "onboarding_complete",
    label: "Onboarding completed",
    step: "Onboarding — Step 7",
    description: "Sent when a tutor completes the full onboarding process. Confirms they are ready to receive clients.",
    vars: ["name", "message"],
  },
  {
    value: "feedback_received",
    label: "Feedback received confirmation",
    step: "Support — Auto-Reply",
    description: "Sent automatically when a user submits feedback through the Help bubble. Confirms receipt.",
    vars: ["name", "message"],
  },
]

export const EMAIL_TRIGGER_DEFAULTS: Record<string, { name: string; subject: string; htmlBody: string }> = {
  career_application: {
    name: "Career Application - Upload Request",
    subject: "Thank you for your application — Next Steps",
    htmlBody: `<p>Hi {{name}},</p><p>Thank you for applying to tutor with J.A.S.S.!</p><p>To complete your application, please upload your documents here:</p><p style="margin:16px 0"><a href="{{uploadUrl}}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">Upload CV & Transcript</a></p><p>You can also paste this link: {{uploadUrl}}</p><p>Once we receive these, we'll review your profile and reach out when a matching client is available.</p><p>— J.A.S.S. Tutors</p>`,
  },
  onboarding_welcome: {
    name: "Onboarding Welcome",
    subject: "Welcome to J.A.S.S. — Next Steps",
    htmlBody: `<p>Hi {{name}},</p>{{message}}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`,
  },
  contract_signed: {
    name: "Contract Signed Confirmation",
    subject: "Contract Signed — Welcome to J.A.S.S.",
    htmlBody: `<p>Hi {{name}},</p>{{message}}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`,
  },
  parent_tutor_match: {
    name: "Parent - Tutor Match Notification",
    subject: "Your tutor match from J.A.S.S.",
    htmlBody: `<p>Hi {{parentName}},</p>{{message}}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`,
  },
  client_invite: {
    name: "Client Account Invite",
    subject: "Your J.A.S.S. account — Complete Setup",
    htmlBody: `<p>Hi {{name}},</p><p>You've been added as a client of J.A.S.S. Tutoring Services. Please complete your account setup to view and pay invoices.</p><p style="margin:16px 0"><a href="{{inviteUrl}}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">Set Up Your Account</a></p><p>You can also paste this link: {{inviteUrl}}</p><p>— J.A.S.S. Tutors</p>`,
  },
  payment_received: {
    name: "Payment Received",
    subject: "Payment Received — Thank You",
    htmlBody: `<p>Hi {{name}},</p><p>Your payment has been received. Thank you for your business!</p><p style="margin:16px 0"><a href="{{inviteUrl}}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">View Invoice</a></p><p>— J.A.S.S. Tutors</p>`,
  },
  invoice_reminder: {
    name: "Invoice Payment Reminder",
    subject: "Reminder: Outstanding Invoice",
    htmlBody: `<p>Hi {{name}},</p><p>This is a friendly reminder that you have an outstanding invoice. Please log in to view and pay it.</p><p style="margin:16px 0"><a href="{{inviteUrl}}" style="background:#18181b;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">View Invoice</a></p><p>— J.A.S.S. Tutors</p>`,
  },
  tutor_assigned: {
    name: "Tutor Assigned to Project",
    subject: "New Student Assignment — J.A.S.S.",
    htmlBody: `<p>Hi {{name}},</p>{{message}}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`,
  },
  onboarding_complete: {
    name: "Onboarding Completed",
    subject: "Onboarding Complete — Welcome to J.A.S.S.!",
    htmlBody: `<p>Hi {{name}},</p>{{message}}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`,
  },
  feedback_received: {
    name: "Feedback Received",
    subject: "We received your message — J.A.S.S.",
    htmlBody: `<p>Hi {{name}},</p><p>Thank you for reaching out! We&apos;ve received your message and our team will get back to you as soon as possible.</p>{{message}}<p style="margin-top:16px">— J.A.S.S. Tutors</p>`,
  },
}

export function getEmailTrigger(value: string): EmailTrigger | undefined {
  return EMAIL_TRIGGERS.find(t => t.value === value)
}

export function getEmailTriggerVars(value: string): string[] {
  return EMAIL_TRIGGERS.find(t => t.value === value)?.vars || ["name"]
}

// ── Navigation links (shared between sidebar and settings) ──

export interface NavLink {
  href: string
  label: string
}

export interface NavSection {
  label: string
  links: NavLink[]
}

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard/analytics", label: "Analytics" },
    ],
  },
  {
    label: "HRM",
    links: [
      { href: "/dashboard/tutors", label: "Team" },
      { href: "/dashboard/waitlist", label: "Tutor Waitlist" },
      { href: "/dashboard/onboarding", label: "Onboarding" },
    ],
  },
  {
    label: "CRM",
    links: [
      { href: "/dashboard/clients", label: "Clients" },
      { href: "/dashboard/leads", label: "Leads" },
    ],
  },
  {
    label: "Productivity",
    links: [
      { href: "/dashboard/projects", label: "Projects" },
      { href: "/dashboard/hours", label: "Log Hours" },
      { href: "/dashboard/requests", label: "Tutoring Requests" },
    ],
  },
  {
    label: "Finance",
    links: [
      { href: "/dashboard/invoices", label: "Invoices" },
      { href: "/dashboard/payments-admin", label: "Payouts" },
      { href: "/dashboard/expenses", label: "Finance" },
      { href: "/dashboard/expenses-only", label: "Expenses" },
      { href: "/dashboard/rates", label: "Rates & Cities" },
      { href: "/dashboard/discounts", label: "Discounts" },
    ],
  },
  {
    label: "Files",
    links: [
      { href: "/dashboard/contracts", label: "Contracts" },
    ],
  },
  {
    label: "Forms",
    links: [
      { href: "/careers", label: "Career Application" },
      { href: "/request-tutor", label: "Request a Tutor" },
    ],
  },
  {
    label: "Data",
    links: [
      { href: "/dashboard/import", label: "Import" },
      { href: "/dashboard/email", label: "Mass Email" },
      { href: "/dashboard/email-log", label: "Email Log" },
      { href: "/dashboard/activity", label: "Activity Log" },
      { href: "/dashboard/data-health", label: "Data Health" },
    ],
  },
  {
    label: "Workflows",
    links: [
      { href: "/dashboard/workflows", label: "Email Templates" },
    ],
  },
  {
    label: "Settings",
    links: [
      { href: "/dashboard/settings", label: "Company" },
    ],
  },
]

export const TUTOR_NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "My Profile" },
  { href: "/dashboard/clients", label: "My Clients" },
  { href: "/dashboard/projects", label: "My Projects" },
  { href: "/dashboard/hours", label: "Log Hours" },
  { href: "/dashboard/requests", label: "Tutoring Offers" },
  { href: "/dashboard/payments", label: "My Payments" },
  { href: "/dashboard/contract", label: "My Contract" },
  { href: "/dashboard/onboarding", label: "My Onboarding" },
]

export const CLIENT_NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "My Profile" },
  { href: "/dashboard/projects", label: "My Projects" },
  { href: "/dashboard/invoices", label: "Invoices" },
]

export const TOP_LEVEL_LINKS: NavLink[] = [
  { href: "/", label: "Homepage" },
  { href: "/careers", label: "Careers Application" },
]

export function getAdminFlatLinks(): NavLink[] {
  const links: NavLink[] = []
  for (const section of ADMIN_NAV_SECTIONS) {
    for (const link of section.links) {
      if (!links.some(l => l.href === link.href)) {
        links.push(link)
      }
    }
  }
  return links
}
