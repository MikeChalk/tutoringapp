"use client"

import { useState } from "react"

export default function FeedbackBubble() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setLoading(true)
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl w-80 mb-2 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-700/50 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Help & Feedback</span>
            <button onClick={() => { setOpen(false); setSent(false); setMessage("") }} className="text-zinc-400 hover:text-zinc-600 text-xs">Close</button>
          </div>
          {sent ? (
            <div className="p-4 text-sm text-zinc-600 dark:text-zinc-400 text-center">
              Sent! We&apos;ll get back to you soon.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <p className="text-xs text-zinc-500">Report a bug or ask a question. Your message will be sent to the admin team.</p>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                required
                placeholder="Describe the issue or ask your question..."
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-zinc-900 dark:bg-white px-3 py-1.5 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </form>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity text-lg"
        title="Help & Feedback"
      >
        ?
      </button>
    </div>
  )
}
