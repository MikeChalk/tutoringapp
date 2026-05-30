"use client"

import { useState, useEffect, useCallback } from "react"

interface EmailTemplate {
  id: string
  name: string
  trigger: string
  subject: string
  htmlBody: string
  isActive: boolean
}

const TRIGGER_LABELS: Record<string, string> = {
  career_application: "Career Application",
  onboarding_welcome: "Onboarding Welcome",
  parent_tutor_match: "Parent / Tutor Match",
  contract_signed: "Contract Signed",
  client_invite: "Client Invite",
  payment_received: "Payment Received",
  invoice_reminder: "Invoice Reminder",
}

const TRIGGER_VARS: Record<string, string> = {
  career_application: "{{name}}, {{uploadUrl}}",
  onboarding_welcome: "{{name}}, {{message}}",
  parent_tutor_match: "{{parentName}}, {{tutorName}}, {{message}}",
  contract_signed: "{{name}}, {{message}}",
  client_invite: "{{name}}, {{inviteUrl}}",
  payment_received: "{{name}}, {{message}}",
  invoice_reminder: "{{name}}, {{inviteUrl}}",
}

export default function WorkflowsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState("")
  const [testResult, setTestResult] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ name: "", trigger: "", subject: "", htmlBody: "" })

  const [editForm, setEditForm] = useState({ name: "", subject: "", htmlBody: "", isActive: true })

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/workflows/templates")
    const data = await res.json()
    setTemplates(data.templates || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  function startEdit(tpl: EmailTemplate) {
    setEditingId(tpl.id)
    setEditForm({ name: tpl.name, subject: tpl.subject, htmlBody: tpl.htmlBody, isActive: tpl.isActive })
  }

  function cancelEdit() {
    setEditingId(null)
    setTestResult(null)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    try {
      await fetch(`/api/workflows/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      await fetchTemplates()
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(tpl: EmailTemplate) {
    await fetch(`/api/workflows/templates/${tpl.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !tpl.isActive }),
    })
    await fetchTemplates()
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
      setTestResult(data.success ? "Test email sent successfully!" : (data.error || "Failed to send"))
    } catch {
      setTestResult("Network error")
    } finally {
      setTesting(null)
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return
    await fetch(`/api/workflows/templates/${id}`, { method: "DELETE" })
    await fetchTemplates()
  }

  async function createTemplate() {
    if (!newTemplate.name || !newTemplate.trigger || !newTemplate.subject || !newTemplate.htmlBody) return
    setSaving(true)
    try {
      const res = await fetch("/api/workflows/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTemplate),
      })
      const data = await res.json()
      if (data.error) {
        alert(data.error)
      } else {
        setNewTemplate({ name: "", trigger: "", subject: "", htmlBody: "" })
        setCreating(false)
        await fetchTemplates()
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-700 rounded-xl" />)}
    </div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Workflows</h2>
          <p className="text-sm text-zinc-500 mt-1">Manage automatic email templates triggered by system events.</p>
        </div>
        <button
          onClick={() => setCreating(!creating)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity dark:bg-zinc-100 dark:text-zinc-900"
        >
          {creating ? "Cancel" : "New Template"}
        </button>
      </div>

      {/* Test email bar */}
      <div className="mb-6 flex items-center gap-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">Test email:</label>
        <input
          type="email"
          placeholder="your@email.com"
          value={testEmail}
          onChange={e => setTestEmail(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {testResult && (
          <span className={`text-xs ${testResult.includes("success") ? "text-green-600" : "text-red-600"}`}>{testResult}</span>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 space-y-4">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Create Custom Template</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
              <input value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Welcome Series 2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Trigger Key</label>
              <input value={newTemplate.trigger} onChange={e => setNewTemplate(p => ({ ...p, trigger: e.target.value }))} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. custom_welcome" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Subject</label>
            <input value={newTemplate.subject} onChange={e => setNewTemplate(p => ({ ...p, subject: e.target.value }))} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">HTML Body</label>
            <textarea value={newTemplate.htmlBody} onChange={e => setNewTemplate(p => ({ ...p, htmlBody: e.target.value }))} rows={6} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={createTemplate} disabled={saving} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity dark:bg-zinc-100 dark:text-zinc-900">
            {saving ? "Creating..." : "Create Template"}
          </button>
        </div>
      )}

      {/* Template list */}
      <div className="space-y-4">
        {templates.map(tpl => (
          <div key={tpl.id} className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-700/50">
              <div className="flex items-center gap-3">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{tpl.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                  {TRIGGER_LABELS[tpl.trigger] || tpl.trigger}
                </span>
                <span className="text-xs text-zinc-400">Vars: {TRIGGER_VARS[tpl.trigger] || "{{name}}"}</span>
                <button
                  onClick={() => toggleActive(tpl)}
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    tpl.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {tpl.isActive ? "Active" : "Disabled"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => sendTest(tpl.id)}
                  disabled={testing === tpl.id || !testEmail.trim()}
                  className="text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50"
                >
                  {testing === tpl.id ? "Sending..." : "Send Test"}
                </button>
                {editingId === tpl.id ? (
                  <>
                    <button onClick={() => saveEdit(tpl.id)} disabled={saving} className="text-xs px-3 py-1 rounded-lg bg-zinc-900 text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900">
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button onClick={cancelEdit} className="text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(tpl)} className="text-xs px-3 py-1 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700">
                      Edit
                    </button>
                    {!TRIGGER_LABELS[tpl.trigger] && (
                      <button onClick={() => deleteTemplate(tpl.id)} className="text-xs px-3 py-1 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Edit form */}
            {editingId === tpl.id && (
              <div className="p-5 space-y-4 bg-zinc-50/50 dark:bg-zinc-800/50">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
                  <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Subject</label>
                  <input value={editForm.subject} onChange={e => setEditForm(p => ({ ...p, subject: e.target.value }))} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">HTML Body</label>
                  <textarea value={editForm.htmlBody} onChange={e => setEditForm(p => ({ ...p, htmlBody: e.target.value }))} rows={8} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            )}

            {/* Preview */}
            {editingId !== tpl.id && (
              <div className="p-5">
                <p className="text-xs font-medium text-zinc-500 uppercase mb-1">Subject</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3">{tpl.subject}</p>
                <p className="text-xs font-medium text-zinc-500 uppercase mb-1">Body Preview</p>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg p-3 max-h-32 overflow-y-auto font-mono whitespace-pre-wrap break-all">
                  {tpl.htmlBody}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
