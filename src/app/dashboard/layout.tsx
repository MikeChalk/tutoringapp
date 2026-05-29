"use client"

import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const adminLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/tutors", label: "Tutors" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/projects", label: "Students" },
  { href: "/dashboard/hours", label: "Log Hours" },
  { href: "/dashboard/invoices", label: "Invoices" },
  { href: "/dashboard/requests", label: "Tutoring Requests" },
  { href: "/dashboard/onboarding", label: "Tutor Waitlist" },
]

const tutorLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/clients", label: "My Clients" },
  { href: "/dashboard/projects", label: "My Students" },
  { href: "/dashboard/hours", label: "Log Hours" },
  { href: "/dashboard/requests", label: "Offers" },
  { href: "/dashboard/payments", label: "My Payments" },
  { href: "/dashboard/contract", label: "My Contract" },
]

const clientLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/projects", label: "My Students" },
  { href: "/dashboard/invoices", label: "Invoices" },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role
  const links = role === "ADMIN" ? adminLinks : role === "TUTOR" ? tutorLinks : clientLinks

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 flex flex-col">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Tutoring Manager
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {session?.user?.role} &middot; {session?.user?.email}
          </p>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href))
                  ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
              }`}
            >
              {link.label}
            </Link>
          ))}
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
