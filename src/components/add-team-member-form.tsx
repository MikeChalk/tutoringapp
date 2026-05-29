"use client"

import { useState } from "react"

interface Template { id: string; name: string }
interface Client { id: string; user: { name: string } }

export function AddTeamMemberForm({ templates, clients }: { templates: Template[]; clients: Client[] }) {
  const [showForm, setShowForm] = useState(false)

  if (!showForm) {
    return (
      <button onClick={() => setShowForm(true)}
        className="mb-6 w-full rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 p-4 text-sm font-medium text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
        + Add Team Member
      </button>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Add Team Member</h3>
        <button onClick={() => setShowForm(false)} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">Cancel</button>
      </div>
      <form action="/api/onboarding" method="POST" className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div><label className="block text-xs text-zinc-500 mb-1">Name</label><input type="text" name="name" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div><label className="block text-xs text-zinc-500 mb-1">Email</label><input type="email" name="email" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Contract Type</label>
          <select name="contractType" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="PRIVATE_TUTORING">Private Tutoring</option>
            <option value="PROGRAM_SUPERVISOR">Program Supervisor</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Year Level</label>
          <select name="yearLevel" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="1ST_YEAR">Year 1</option><option value="2ND_YEAR">Year 2</option><option value="3RD_YEAR">Year 3</option>
          </select>
        </div>
        {templates.length > 0 && (
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Template (optional)</label>
            <select name="templateId" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">No template</option>
              {templates.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
        )}
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Create & Start Onboarding</button>
        <div className="col-span-full">
          <label className="block text-xs text-zinc-500 mb-1">Grade Levels</label>
          <input type="text" name="gradeLevels" placeholder="ELEMENTARY, SEC1_2, SEC3, SEC4_5, CEGEP, UNI" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </form>
    </div>
  )
}
