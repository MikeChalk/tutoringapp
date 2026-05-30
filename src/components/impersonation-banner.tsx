"use client"

import { useSession } from "next-auth/react"

export default function ImpersonationBanner() {
  const { data: session } = useSession()

  if (!session?.user?.impersonatedBy) return null

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-sm flex items-center justify-between">
      <span>
        Impersonating <strong>{session.user.name}</strong> ({session.user.role})
      </span>
      <form action="/api/admin/stop-impersonate" method="POST">
        <button
          type="submit"
          className="bg-white text-amber-700 px-3 py-1 rounded text-xs font-medium hover:bg-amber-50 transition-colors"
        >
          Stop Impersonating
        </button>
      </form>
    </div>
  )
}