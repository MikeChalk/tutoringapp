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

function LogoMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#1E3A5F" />
      <path d="M20 12L28 16.5L20 21L12 16.5L20 12Z" fill="white" />
      <path d="M14 17.5V23L20 27L26 23V17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M28 16.5V24" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<"tutor" | "client">("tutor")
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

  const buttonLabel = loading
    ? "Signing in..."
    : role === "tutor"
      ? "Sign in as tutor"
      : "Sign in as client"

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F6F8] px-4 font-[family-name:var(--font-inter)]">
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
        <div className="bg-white rounded-xl border border-[#e3e7eb] p-8">
          <div className="flex flex-col items-center mb-6">
            <LogoMark />
            <h1 className="text-xl font-bold text-[#1E3A5F] mt-3">Tutoring Manager</h1>
            <p className="text-sm text-[#5B7B9A] mt-1">Sign in to continue</p>
          </div>

          {justSetup && (
            <div className="bg-[#ecfdf5] text-[#047857] text-sm rounded-lg px-4 py-2 mb-4">
              Account setup complete! Sign in below.
            </div>
          )}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2 mb-4">
              {error}
            </div>
          )}

          <div className="flex bg-[#F4F6F8] rounded-lg p-1 mb-5">
            <button
              type="button"
              onClick={() => setRole("tutor")}
              className={`flex-1 text-sm font-medium px-3 py-2 rounded-md transition-colors ${
                role === "tutor"
                  ? "bg-white text-[#1E3A5F] shadow-sm"
                  : "text-[#5B7B9A] hover:text-[#1E3A5F]"
              }`}
            >
              Tutor
            </button>
            <button
              type="button"
              onClick={() => setRole("client")}
              className={`flex-1 text-sm font-medium px-3 py-2 rounded-md transition-colors ${
                role === "client"
                  ? "bg-white text-[#1E3A5F] shadow-sm"
                  : "text-[#5B7B9A] hover:text-[#1E3A5F]"
              }`}
            >
              Client
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-[#5B7B9A] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-[#e3e7eb] bg-white px-3 py-2.5 text-sm text-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5B7B9A] mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-[#e3e7eb] bg-white px-3 py-2.5 text-sm text-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
              />
            </div>
            {recaptchaEnabled && (
              <div ref={recaptchaRef} className="flex justify-center min-h-[78px]" />
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#1E3A5F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16304f] transition-colors disabled:opacity-50"
            >
              {buttonLabel}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-[#5B7B9A]">
            <Link href="/forgot-password" className="hover:text-[#1E3A5F] hover:underline">Forgot password?</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#F4F6F8]"><p className="text-[#5B7B9A]">Loading...</p></div>}>
      <LoginContent />
    </Suspense>
  )
}