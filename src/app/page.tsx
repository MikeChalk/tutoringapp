import Link from "next/link"

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-zinc-900 dark:to-zinc-800 min-h-screen">
      <main className="flex flex-col items-center text-center gap-8 px-6 max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Tutoring Manager
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-lg">
          The all-in-one platform for your tutoring company. Log hours, send
          invoices, match tutors to clients, and automate onboarding.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-zinc-900 px-8 text-sm font-medium text-white hover:bg-zinc-800 transition-colors dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Sign In
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 w-full">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
            <div className="text-2xl mb-2">&#x1F4DD;</div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Log Hours</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Tutors track time per project and client
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
            <div className="text-2xl mb-2">&#x1F4E8;</div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Send Invoices</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Auto-generate invoices from logged hours
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-700">
            <div className="text-2xl mb-2">&#x1F91D;</div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Match Tutors</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Pair requests with the right tutor automatically
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
