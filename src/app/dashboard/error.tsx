"use client"

export default function Error({ reset, error }: { reset: () => void; error: Error & { digest?: string } }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Something went wrong</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{error.message || "An unexpected error occurred."}</p>
      <button onClick={reset} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
        Try again
      </button>
    </div>
  )
}