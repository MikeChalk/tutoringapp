"use client"

import { useState } from "react"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const adminSections = [
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
      { href: "/dashboard/discounts", label: "Discounts" },
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
      { href: "/dashboard/rates", label: "Rates & Cities" },
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
    ],
  },
  {
    label: "Data",
    links: [
      { href: "/dashboard/import", label: "Import" },
      { href: "/dashboard/email", label: "Mass Email" },
    ],
  },
  {
    label: "Settings",
    links: [
      { href: "/dashboard/settings", label: "Company" },
    ],
  },
]

const tutorLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "My Profile" },
  { href: "/dashboard/clients", label: "My Clients" },
  { href: "/dashboard/projects", label: "My Students" },
  { href: "/dashboard/hours", label: "Log Hours" },
  { href: "/dashboard/requests", label: "Offers" },
  { href: "/dashboard/payments", label: "My Payments" },
  { href: "/dashboard/contract", label: "My Contract" },
]

const clientLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "My Profile" },
  { href: "/dashboard/projects", label: "My Students" },
  { href: "/dashboard/invoices", label: "Invoices" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role
  const isAdminRole = role === "ADMIN" || role === "CITY_ADMIN"

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 flex flex-col">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Tutoring Manager</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {session?.user?.role} &middot; {session?.user?.email}
          </p>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-auto">
          {isAdminRole ? (
            <AdminNav pathname={pathname} />
          ) : (
            (role === "TUTOR" ? tutorLinks : clientLinks).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href + "/"))
                    ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                }`}
              >
                {link.label}
              </Link>
            ))
          )}
        </nav>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left"
          >
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-zinc-50 dark:bg-zinc-900 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}

function AdminNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const s of adminSections) initial[s.label] = true
    return initial
  })

  function isActive(href: string) {
    if (pathname === href) return true
    return href !== "/dashboard" && pathname.startsWith(href + "/")
  }

  return (
    <>
      {adminSections.map((section) => (
        <div key={section.label}>
          {section.links.length === 1 && section.label === "Overview" ? (
            <Link
              href={section.links[0].href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors block ${
                pathname === section.links[0].href
                  ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
              }`}
            >
              {section.links[0].label}
            </Link>
          ) : (
            <>
              <button
                onClick={() => setOpen((p) => ({ ...p, [section.label]: !p[section.label] }))}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                {section.label}
                <svg className={`w-3 h-3 transition-transform ${open[section.label] ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {open[section.label] && (
                <div className="ml-2 flex flex-col gap-1 mt-1">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                        isActive(link.href)
                          ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </>
  )
}
