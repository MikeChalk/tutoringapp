"use client"

import { useState, useEffect, useCallback } from "react"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ADMIN_NAV_SECTIONS, CLIENT_NAV_LINKS } from "@/lib/constants"
import ImpersonationBanner from "@/components/impersonation-banner"
import FeedbackBubble from "@/components/feedback-bubble"
import { ThemeToggle } from "@/components/theme-toggle"
import TutorSidebar from "@/components/tutor-sidebar"
import { Menu, X } from "lucide-react"
import ClientSidebar from "@/components/client-sidebar"

export default function DashboardShell({ children, role }: { children: React.ReactNode; role: string | null }) {
  const isTutorRole = role === "TUTOR"
  const isClientRole = role === "CLIENT"
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const sidebarContent = isTutorRole ? <TutorSidebar /> : isClientRole ? <ClientSidebar /> : <SidebarContent role={role} />
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:flex w-64 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 flex-col shrink-0">
        {sidebarContent}
      </aside>

      <div className="flex-1 bg-zinc-50 dark:bg-zinc-900 min-h-screen flex flex-col">
        <header className="lg:hidden sticky top-0 z-50 flex items-center gap-3 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-4 py-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
          </button>
          <Link href="/dashboard" className="text-lg font-bold text-zinc-900 dark:text-zinc-100 hover:opacity-80 transition-opacity">J.A.S.S. Portal</Link>
        </header>

        <main className="flex-1 overflow-y-auto">
          <ImpersonationBanner />
          <div className="p-4 lg:p-8">{children}</div>
          <FeedbackBubble />
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden" onClick={closeMobile}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-zinc-800 shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
              <Link href="/dashboard" className="text-lg font-bold text-zinc-900 dark:text-zinc-100 hover:opacity-80 transition-opacity">J.A.S.S. Portal</Link>
              <button onClick={closeMobile} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors" aria-label="Close menu">
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>
            <nav className="flex-1 overflow-auto p-4">
              {isTutorRole ? <TutorSidebar /> : <SidebarContent role={role} onNavigate={closeMobile} />}
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarContent({ role, onNavigate }: { role: string | null; onNavigate?: () => void }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const isAdminRole = role === "ADMIN" || role === "CITY_ADMIN"

  return (
    <>
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
        <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">J.A.S.S. Portal</h1>
      </Link>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {role} &middot; {session?.user?.email}
        </p>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-1 overflow-auto">
        {isAdminRole ? (
          <AdminNav pathname={pathname} onNavigate={onNavigate} />
        ) : (
          CLIENT_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
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
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
        <button
          onClick={() => {
            sessionStorage.removeItem("welcomeShown")
            sessionStorage.removeItem("welcomeDate")
            document.cookie = "lastGreeting=; path=/; max-age=0; SameSite=Lax"
            signOut({ callbackUrl: "/" })
          }}
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left flex-1"
        >
          Sign Out
        </button>
        <ThemeToggle />
      </div>
    </>
  )
}

function AdminNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const s of ADMIN_NAV_SECTIONS) initial[s.label] = true
    return initial
  })

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-sections")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed && typeof parsed === "object") setOpen(parsed)
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    try { localStorage.setItem("sidebar-sections", JSON.stringify(open)) } catch { /* ignore */ }
  }, [open])

  function isActive(href: string) {
    if (pathname === href) return true
    return href !== "/dashboard" && pathname.startsWith(href + "/")
  }

  return (
    <>
      {ADMIN_NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          {section.links.length === 1 && section.label === "Overview" ? (
            <Link
              href={section.links[0].href}
              onClick={onNavigate}
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
                      onClick={onNavigate}
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