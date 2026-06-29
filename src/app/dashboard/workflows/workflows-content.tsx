"use client"

import { useState, useEffect } from "react"
import RichTextEditor from "@/components/rich-text-editor"
import { EMAIL_TRIGGERS, getEmailTrigger, getEmailTriggerVars } from "@/lib/constants"

interface EmailTemplate {
  id: string
  name: string
  trigger: string
  subject: string
  htmlBody: string
  isActive: boolean
}

export default function WorkflowsContent() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState("")
  const [testResult, setTestResult] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    trigger: "",
    subject: "",
    htmlBody: "",
    customTrigger: "",
  })

  const [editForm, setEditForm] = useState({
    name: "",
    subject: "",
    htmlBody: "",
    isActive: true,
  })

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const res = await fetch("/api/workflows/templates")
        const data = await res.json()
        if (!ignore) {
          if (!res.ok) {
            setError(data.error || "Failed to load templates")
          } else {
            setTemplates(data.templates || [])
          }
          setLoading(false)
        }
      } catch {
        if (!ignore) {
          setError("Network error loading templates")
          setLoading(false)
        }
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  async function refreshTemplates() {
    setError(null)
    try {
      const res = await fetch("/api/workflows/templates")
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to refresh templates")
      } else {
        setTemplates(data.templates || [])
      }
    } catch {
      setError("Network error refreshing templates")
    }
  }

  function startEdit(tpl: EmailTemplate) {
    setEditingId(tpl.id)
    setEditForm({
      name: tpl.name,
      subject: tpl.subject,
      htmlBody: tpl.htmlBody,
      isActive: tpl.isActive,
    })
    setTestResult(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setTestResult(null)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/workflows/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to save template")
      } else {
        await refreshTemplates()
        setEditingId(null)
      }
    } catch {
      setError("Network error saving template")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(tpl: EmailTemplate) {
    setError(null)
    try {
      const res = await fetch(`/api/workflows/templates/${tpl.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !tpl.isActive }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to toggle template")
      } else {
        await refreshTemplates()
      }
    } catch {
      setError("Network error toggling template")
    }
  }

  async function sendTest(id: string) {
    if (!testEmail.trim()) return
    setTesting(id)
    setTestResult(null)
    try {
      const res = await fetch(`/api/workflows/templates/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: testEmail.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setTestResult("Test email sent successfully!")
      } else {
        setTestResult(data.error || "Failed to send")
      }
    } catch {
      setTestResult("Network error")
    } finally {
      setTesting(null)
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return
    setError(null)
    try {
      const res = await fetch(`/api/workflows/templates/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to delete template")
      } else {
        await refreshTemplates()
      }
    } catch {
      setError("Network error deleting template")
    }
  }

  async function createTemplate() {
    const trigger = newTemplate.trigger === "__custom__" ? newTemplate.customTrigger : newTemplate.trigger
    if (!newTemplate.name || !trigger || !newTemplate.subject || !newTemplate.htmlBody) return

    setSaving(true)
    try {
      const res = await fetch("/api/workflows/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplate.name,
          trigger,
          subject: newTemplate.subject,
          htmlBody: newTemplate.htmlBody,
        }),
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else {
        setNewTemplate({ name: "", trigger: "", subject: "", htmlBody: "", customTrigger: "" })
        setCreating(false)
        await refreshTemplates()
      }
    } finally {
      setSaving(false)
    }
  }

  const createVars = newTemplate.trigger && newTemplate.trigger !== "__custom__"
    ? getEmailTriggerVars(newTemplate.trigger)
    : (newTemplate.trigger === "__custom__" ? ["name"] : [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Email Templates</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Customize the automatic emails sent at each step of the J.A.S.S. journey. Changes take effect immediately.
          </p>
        </div>
        <button
          onClick={() => setCreating(!creating)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity dark:bg-zinc-100 dark:text-zinc-900"
        >
          {creating ? "Cancel" : "New Template"}
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-3 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-2">&times;</button>
        </div>
      )}

      <div className="mb-6 flex items-center gap-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
          Send test to:
        </label>
        <input
          type="email"
          placeholder="your@email.com"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {testResult && (
          <span className={`text-xs whitespace-nowrap ${testResult.includes("success") ? "text-green-600" : "text-red-600"}`}>
            {testResult}
          </span>
        )}
      </div>

      {creating && (
        <div className="mb-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 space-y-4">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Create Custom Template</h3>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Template Name</label>
            <input
              value={newTemplate.name}
              onChange={(e) => setNewTemplate((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Welcome Series Part 2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              When should this email be sent?
            </label>
            <select
              value={newTemplate.trigger}
              onChange={(e) => setNewTemplate((p) => ({ ...p, trigger: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select a trigger —</option>
              {EMAIL_TRIGGERS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.step}: {opt.label}
                </option>
              ))}
              <option value="__custom__">Custom trigger (manual only)</option>
            </select>
            {newTemplate.trigger && newTemplate.trigger !== "__custom__" && (() => {
              const info = getEmailTrigger(newTemplate.trigger)
              return (
                <p className="text-xs text-zinc-500 mt-1">
                  {info?.description}
                </p>
              )
            })()}
            {newTemplate.trigger === "__custom__" && (
              <div className="mt-2">
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Custom Trigger Key</label>
                <input
                  value={newTemplate.customTrigger}
                  onChange={(e) => setNewTemplate((p) => ({ ...p, customTrigger: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. custom_new_year_greeting"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Custom templates can only be sent manually through the Mass Email page. Use{" "}
                  <code className="bg-zinc-100 dark:bg-zinc-700 px-1 rounded">{"{{name}}"}</code> for the recipient&apos;s name.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email Subject</label>
            <input
              value={newTemplate.subject}
              onChange={(e) => setNewTemplate((p) => ({ ...p, subject: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email subject line"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email Body</label>
            <RichTextEditor
              content={newTemplate.htmlBody}
              onChange={(html) => setNewTemplate((p) => ({ ...p, htmlBody: html }))}
              placeholder="Write your email content here..."
              variables={createVars}
            />
          </div>

          <button
            onClick={createTemplate}
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? "Creating..." : "Create Template"}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {templates.map((tpl) => {
          const info = getEmailTrigger(tpl.trigger)
          const editVars = getEmailTriggerVars(tpl.trigger)
          return (
            <div key={tpl.id} className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-700/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div>
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{tpl.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {info ? (
                        <>
                          <span className="font-medium">{info.step}</span>
                          {" — "}{info.label}
                        </>
                      ) : (
                        <span>Custom trigger: <code className="bg-zinc-100 dark:bg-zinc-700 px-1 rounded text-xs">{tpl.trigger}</code></span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-400 whitespace-nowrap">
                    Vars: {editVars.map(v => `{{${v}}}`).join(", ")}
                  </span>
                  <button
                    onClick={() => toggleActive(tpl)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      tpl.isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {tpl.isActive ? "Active" : "Disabled"}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => sendTest(tpl.id)}
                    disabled={testing === tpl.id || !testEmail.trim()}
                    className="text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50"
                  >
                    {testing === tpl.id ? "Sending..." : "Send Test"}
                  </button>
                  {editingId === tpl.id ? (
                    <>
                      <button
                        onClick={() => saveEdit(tpl.id)}
                        disabled={saving}
                        className="text-xs px-3 py-1 rounded-lg bg-zinc-900 text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(tpl)}
                        className="text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                      >
                        Edit
                      </button>
                      {!info && (
                        <button
                          onClick={() => deleteTemplate(tpl.id)}
                          className="text-xs px-3 py-1 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {editingId === tpl.id && (
                <div className="p-5 space-y-4 bg-zinc-50/50 dark:bg-zinc-800/50">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Template Name</label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email Subject</label>
                    <input
                      value={editForm.subject}
                      onChange={(e) => setEditForm((p) => ({ ...p, subject: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email Body</label>
                    <RichTextEditor
                      content={editForm.htmlBody}
                      onChange={(html) => setEditForm((p) => ({ ...p, htmlBody: html }))}
                      placeholder="Write your email content here..."
                      variables={editVars}
                    />
                  </div>
                </div>
              )}

              {editingId !== tpl.id && (
                <div className="p-5">
                  <p className="text-xs font-medium text-zinc-500 uppercase mb-1">Subject Preview</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">{tpl.subject}</p>
                  <p className="text-xs font-medium text-zinc-500 uppercase mb-1">Body Preview</p>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs">{tpl.htmlBody}</pre>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}