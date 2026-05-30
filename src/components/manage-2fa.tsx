"use client"

import { useState } from "react"
import Image from "next/image"

export default function Manage2FA({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [step, setStep] = useState<"idle" | "generating" | "verify" | "done" | "disable">(
    initiallyEnabled ? "done" : "idle"
  )
  const [secret, setSecret] = useState("")
  const [qrUrl, setQrUrl] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError("")
    const res = await fetch("/api/settings/2fa/generate", { method: "POST" })
    if (!res.ok) {
      setError("Failed to generate 2FA secret")
      setLoading(false)
      return
    }
    const data = await res.json()
    setSecret(data.secret)
    setQrUrl(
      `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.otpauthUrl)}`
    )
    setStep("verify")
    setLoading(false)
  }

  async function handleEnable() {
    if (code.length < 6) return
    setLoading(true)
    setError("")
    const res = await fetch("/api/settings/2fa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, code }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Failed to enable 2FA")
      setLoading(false)
      return
    }
    setStep("done")
    setLoading(false)
  }

  async function handleDisable() {
    if (!password) return
    setLoading(true)
    setError("")
    const res = await fetch("/api/settings/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Failed to disable 2FA")
      setLoading(false)
      return
    }
    setStep("idle")
    setPassword("")
    setLoading(false)
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Two-Factor Authentication</h3>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg px-4 py-2 mb-4">{error}</div>
      )}

      {step === "done" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300">
              Enabled
            </span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Two-factor authentication is active. You&apos;ll be asked for a verification code from your authenticator app each time you sign in.
          </p>
          <button
            onClick={() => { setStep("disable"); setError("") }}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Disable 2FA
          </button>
        </div>
      )}

      {step === "disable" && (
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Enter your password to disable two-factor authentication.</p>
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleDisable}
              disabled={loading || !password}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Disabling..." : "Confirm"}
            </button>
            <button
              onClick={() => setStep("done")}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === "idle" && (
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Add an extra layer of security to your account. Two-factor authentication requires a verification code from your authenticator app (e.g. Google Authenticator, Authy) in addition to your password.
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Generating..." : "Enable 2FA"}
          </button>
        </div>
      )}

      {step === "verify" && (
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Scan this QR code with your authenticator app, then enter the verification code below.
          </p>
          <div className="flex flex-col items-center gap-4 mb-4">
            {qrUrl && (
              <Image src={qrUrl} alt="2FA QR Code" width={200} height={200} className="rounded-lg border border-zinc-200 dark:border-zinc-600" unoptimized />
            )}
            <p className="text-xs text-zinc-400">Or enter this key manually: <code className="text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 px-1 rounded">{secret}</code></p>
          </div>
          <div className="flex gap-2 items-end">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-32 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleEnable}
              disabled={loading || code.length < 6}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Enable"}
            </button>
            <button
              onClick={() => { setStep("idle"); setError("") }}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}