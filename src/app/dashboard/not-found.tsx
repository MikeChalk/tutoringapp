import Link from "next/link"

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">404</h1>
      <p className="text-lg text-zinc-500 dark:text-zinc-400 mb-6">Page not found</p>
      <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-8">You don&apos;t have access to this page, or it doesn&apos;t exist.</p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-zinc-900 dark:bg-white px-6 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}