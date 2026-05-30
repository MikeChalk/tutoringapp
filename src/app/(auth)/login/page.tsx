"use client"

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<"team" | "client">("team")
  const justSetup = searchParams.get("setup") === "1"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password")
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 text-center">
            Sign In
          </h1>

          {justSetup && (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm rounded-lg px-4 py-2 mb-4">
              Account setup complete! Sign in below.
            </div>
          )}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg px-4 py-2 mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setRole("team")}
              className={`flex-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                role === "team"
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600"
              }`}
            >
              Team Member
            </button>
            <button
              type="button"
              onClick={() => setRole("client")}
              className={`flex-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                role === "client"
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600"
              }`}
            >
              Client
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-zinc-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <a href="/forgot-password" className="text-blue-600 dark:text-blue-400 hover:underline">
              Forgot password?
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-zinc-400">Loading...</p></div>}>
      <LoginContent />
    </Suspense>
  )
}
