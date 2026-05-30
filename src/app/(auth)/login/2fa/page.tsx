"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function Verify2FAContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tempToken = searchParams.get("token")
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tempToken) return
    setLoading(true)
    setError("")

    const res = await fetch("/api/auth/verify-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken, totpCode: code }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Verification failed")
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  if (!tempToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-8 max-w-sm w-full text-center">
          <p className="text-zinc-600 dark:text-zinc-400">Invalid or expired verification link.</p>
          <a href="/login" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline text-sm">Back to login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 text-center">Two-Factor Authentication</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 text-center">Enter the code from your authenticator app.</p>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg px-4 py-2 mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                required
                placeholder="000000"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full rounded-lg bg-zinc-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-zinc-500">
            <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Back to login</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-zinc-400">Loading...</p></div>}>
      <Verify2FAContent />
    </Suspense>
  )
}