"use client"

import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 text-center">Reset Password</h1>
          {sent ? (
            <div className="text-center">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                If an account with that email exists, we&apos;ve sent a reset link. Check your inbox.
              </p>
              <Link href="/login" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Sign In</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-zinc-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
              <Link href="/login" className="text-center text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Sign In</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}