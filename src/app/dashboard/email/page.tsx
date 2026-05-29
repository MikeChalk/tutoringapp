"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"

function MassEmailContent() {
  const searchParams = useSearchParams()
  const [group, setGroup] = useState("waitlist")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState("")
  const [previewCount, setPreviewCount] = useState(0)

  useEffect(() => {
    const g = searchParams.get("group") || "waitlist"
    setGroup(g)
  }, [searchParams])

  async function handlePreview() {
    const res = await fetch(`/api/email/bulk?group=${group}`)
    const data = await res.json()
    setPreviewCount(data.count || 0)
    setResult(`Found ${data.count || 0} recipients`)
  }

  async function handleSend() {
    if (!subject || !message) return
    setSending(true)
    setResult("Sending...")
    const fd = new FormData()
    fd.append("group", group)
    fd.append("subject", subject)
    fd.append("message", message)
    const res = await fetch("/api/email/bulk", { method: "POST", body: fd })
    const data = await res.json()
    setResult(data.error ? `Error: ${data.error}` : `Sent to ${data.sent || 0} recipients`)
    setSending(false)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Mass Email</h2>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-2">Recipients</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "waitlist", label: "Waitlist Tutors" },
                { value: "team", label: "All Team Members" },
                { value: "tutors", label: "All Tutors" },
                { value: "supervisors", label: "Program Supervisors" },
              ].map(o => (
                <button key={o.value} type="button"
                  onClick={() => setGroup(o.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    group === o.value ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600"
                  }`}>{o.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Subject</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Email subject line..."
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={6}
              placeholder="Write your email message here..."
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={handlePreview} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
              Preview Count
            </button>
            <button type="button" onClick={handleSend} disabled={sending || !subject || !message}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
              {sending ? "Sending..." : "Send Email"}
            </button>
          </div>

          {result && (
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{result}</p>
              {previewCount > 0 && <p className="text-xs text-zinc-400 mt-1">Preview shows count only — no emails sent.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MassEmailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Loading...</div>}>
      <MassEmailContent />
    </Suspense>
  )
}
