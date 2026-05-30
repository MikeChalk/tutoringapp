"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import RichTextEditor from "@/components/rich-text-editor"

const GROUPS = [
  { value: "waitlist", label: "Waitlist Tutors", description: "Tutors who applied but haven't been onboarded yet" },
  { value: "team", label: "All Team Members", description: "Everyone with a staff role (tutors + admins)" },
  { value: "tutors", label: "All Tutors", description: "Every tutor regardless of onboarding status" },
  { value: "supervisors", label: "Program Supervisors", description: "Tutors with an active supervisor contract" },
]

function MassEmailContent() {
  const searchParams = useSearchParams()
  const [group, setGroup] = useState("waitlist")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState("")
  const [previewCount, setPreviewCount] = useState(0)
  const [testEmail, setTestEmail] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState("")

  useEffect(() => {
    const g = searchParams.get("group") || "waitlist"
    setGroup(g)
  }, [searchParams])

  async function handlePreview() {
    setResult("Counting...")
    const res = await fetch(`/api/email/bulk?group=${group}`)
    const data = await res.json()
    setPreviewCount(data.count || 0)
    setResult(`Found ${data.count || 0} recipient${data.count === 1 ? "" : "s"} in the "${GROUPS.find(g => g.value === group)?.label || group}" group. No emails have been sent.`)
  }

  async function handleSendTest() {
    if (!testEmail.trim() || !subject || !message) return
    setTesting(true)
    setTestResult("")
    try {
      const fd = new FormData()
      fd.append("_action", "test")
      fd.append("to", testEmail.trim())
      fd.append("subject", subject)
      fd.append("message", message)
      const res = await fetch("/api/email/bulk", { method: "POST", body: fd })
      const data = await res.json()
      setTestResult(data.error ? `Error: ${data.error}` : "Test email sent!")
    } catch {
      setTestResult("Network error")
    } finally {
      setTesting(false)
    }
  }

  async function handleSend() {
    if (!subject || !message) return
    if (!confirm(`Send this email to ALL recipients in the "${GROUPS.find(g => g.value === group)?.label}" group?`)) return
    setSending(true)
    setResult("Sending...")
    const fd = new FormData()
    fd.append("group", group)
    fd.append("subject", subject)
    fd.append("message", message)
    const res = await fetch("/api/email/bulk", { method: "POST", body: fd })
    const data = await res.json()
    setResult(data.error ? `Error: ${data.error}` : `Sent to ${data.sent || 0} recipient${data.sent === 1 ? "" : "s"}${data.failed ? ` (${data.failed} failed)` : ""}`)
    setSending(false)
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Mass Email</h2>
      <p className="text-sm text-zinc-500 mb-6">Send a bulk email to a group of recipients. Use {"{{name}}"} to personalize each email with the recipient&apos;s name.</p>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 space-y-4">
        {/* Group selection */}
        <div>
          <label className="block text-xs text-zinc-500 mb-2">Recipient Group</label>
          <div className="flex flex-wrap gap-2">
            {GROUPS.map(o => (
              <button key={o.value} type="button"
                onClick={() => setGroup(o.value)}
                title={o.description}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  group === o.value
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {GROUPS.find(g => g.value === group)?.description}
          </p>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Email subject line..."
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Message with rich text editor */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Message</label>
          <RichTextEditor
            content={message}
            onChange={setMessage}
            placeholder="Write your email message here... Use {{name}} to personalize."
            variables={["name"]}
          />
        </div>

        {/* Test email row */}
        <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">Send test to:</label>
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleSendTest}
            disabled={testing || !testEmail.trim() || !subject || !message}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50 whitespace-nowrap"
          >
            {testing ? "Sending..." : "Send Test"}
          </button>
          {testResult && (
            <span className={`text-xs whitespace-nowrap ${testResult.includes("Error") || testResult.includes("error") ? "text-red-600" : "text-green-600"}`}>
              {testResult}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button type="button" onClick={handlePreview}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          >
            Preview Count
          </button>
          <button type="button" onClick={handleSend} disabled={sending || !subject || !message}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send to All"}
          </button>
        </div>

        {result && (
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{result}</p>
            {previewCount > 0 && (
              <p className="text-xs text-zinc-400 mt-1">
                Preview Count tells you how many people will receive the email before you send. It does not send anything.
              </p>
            )}
          </div>
        )}
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
