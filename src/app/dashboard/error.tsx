"use client"

import { useEffect } from "react"

export default function Error({ reset, error }: { reset: () => void; error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("Dashboard error boundary:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-16 p-4">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Something went wrong</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">{error.message || "An unexpected error occurred."}</p>
      {error.digest && <p className="text-xs text-zinc-400 mb-4">Digest: {error.digest}</p>}
      <pre className="text-xs bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-3 rounded-lg max-w-full overflow-auto mb-4 whitespace-pre-wrap">{error.stack}</pre>
      <button onClick={reset} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
        Try again
      </button>
    </div>
  )
}