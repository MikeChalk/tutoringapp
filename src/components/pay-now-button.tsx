"use client"

import { useState } from "react"

export function PayNowButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false)

  async function handlePay() {
    setLoading(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || "Payment failed")
      }
    } catch {
      alert("Payment service unavailable")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handlePay} disabled={loading}
      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50">
      {loading ? "Loading..." : "Pay Now"}
    </button>
  )
}
