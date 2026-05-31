"use client"

import { useState, Suspense, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Script from "next/script"

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""
const recaptchaEnabled = !!RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY.length > 10

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: string | HTMLElement, params: Record<string, unknown>) => number
      getResponse: (widgetId?: number) => string
      reset: (widgetId?: number) => void
    }
    onRecaptchaLoad?: () => void
  }
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<"team" | "client">("team")
  const recaptchaWidgetId = useRef<number | null>(null)
  const recaptchaRef = useRef<HTMLDivElement>(null)
  const [recaptchaReady, setRecaptchaReady] = useState(false)
  const justSetup = searchParams.get("setup") === "1"

  useEffect(() => {
    if (recaptchaReady && recaptchaRef.current && recaptchaWidgetId.current === null) {
      const id = window.grecaptcha?.render(recaptchaRef.current, {
        sitekey: RECAPTCHA_SITE_KEY,
        theme: "light",
        size: "normal",
      })
      if (id !== undefined) recaptchaWidgetId.current = id
    }
  }, [recaptchaReady])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const recaptchaToken = recaptchaEnabled
      ? (window.grecaptcha?.getResponse(recaptchaWidgetId.current ?? 0) || "")
      : ""

    if (recaptchaEnabled && !recaptchaToken) {
      setError("Please complete the reCAPTCHA verification")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/prelogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, recaptchaToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Invalid email or password")
        setLoading(false)
        if (recaptchaEnabled) window.grecaptcha?.reset(recaptchaWidgetId.current ?? 0)
        return
      }

      if (data.needs2fa) {
        router.push(`/login/2fa?token=${encodeURIComponent(data.tempToken)}`)
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
      {recaptchaEnabled && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit`}
          strategy="afterInteractive"
          onLoad={() => {
            window.onRecaptchaLoad = () => setRecaptchaReady(true)
            if (window.grecaptcha) setRecaptchaReady(true)
          }}
        />
      )}
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 text-center">Sign In</h1>

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
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {recaptchaEnabled && (
              <div ref={recaptchaRef} className="flex justify-center min-h-[78px]" />
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-zinc-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/forgot-password" className="text-blue-600 dark:text-blue-400 hover:underline">Forgot password?</Link>
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