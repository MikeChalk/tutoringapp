"use client"

import { useState, useEffect } from "react"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ADMIN_NAV_SECTIONS, TUTOR_NAV_LINKS, CLIENT_NAV_LINKS } from "@/lib/constants"
import ImpersonationBanner from "@/components/impersonation-banner"
import FeedbackBubble from "@/components/feedback-bubble"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function handleConfirm(e: Event) {
      const target = e.target as HTMLElement
      const form = target.closest("form")
      if (!form) return
      const msg = form.getAttribute("data-confirm")
      if (!msg) return
      const isSubmit = target.closest('button[type="submit"], input[type="submit"]')
      if (!isSubmit) return
      if (!confirm(msg)) e.preventDefault()
    }
    document.addEventListener("click", handleConfirm)
    return () => document.removeEventListener("click", handleConfirm)
  }, [])

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar via Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden fixed top-3 left-3 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full bg-white dark:bg-zinc-800">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>

      <main className="flex-1 bg-zinc-50 dark:bg-zinc-900 overflow-auto">
        <ImpersonationBanner />
        <div className="p-4 lg:p-8 pt-14 lg:pt-8">{children}</div>
        <FeedbackBubble />
      </main>
    </div>
  )
}

function SidebarContent() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role
  const isAdminRole = role === "ADMIN" || role === "CITY_ADMIN"

  return (
    <>
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
          (role === "TUTOR" ? TUTOR_NAV_LINKS : CLIENT_NAV_LINKS).map((link) => (
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
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left flex-1"
        >
          Sign Out
        </button>
        <ThemeToggle />
      </div>
    </>
  )
}

function AdminNav({ pathname }: { pathname: string }) {
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
      } catch { /* ignore corrupted data */ }
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
