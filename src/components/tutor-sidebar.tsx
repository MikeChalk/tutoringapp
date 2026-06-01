"use client"

import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { TUTOR_NAV_LINKS } from "@/lib/constants"
import { ThemeToggle } from "@/components/theme-toggle"

export default function TutorSidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  return (
    <>
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">J.A.S.S.</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Tutor &middot; {session?.user?.name}
        </p>
      </div>
      <nav className="flex-1 p-4 flex flex-col gap-1 overflow-auto">
        {TUTOR_NAV_LINKS.map((link) => (
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
        ))}
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