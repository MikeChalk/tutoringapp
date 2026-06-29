"use client"

import { useState } from "react"
import SearchableSelect from "@/components/searchable-select"
import { GRADE_LABELS, PROJECT_STATUSES, STATUS_LABELS } from "@/lib/constants"

interface Client { id: string; user: { name: string } }
interface City { id: string; name: string }

export function EditProjectForm({ project, clients, cities }: {
  project: {
    id: string; name: string; description: string | null; school: string
    gradeLevel: string; status: string; projectType: string; subjects: string
    clientId: string | null; cityId: string | null
  }
  clients: Client[]
  cities: City[]
}) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="mb-6 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
        Edit Project
      </button>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Edit Project</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">Cancel</button>
      </div>
      <form action="/api/projects/update" method="POST" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input type="hidden" name="projectId" value={project.id} />
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Project Name</label>
          <input type="text" name="name" defaultValue={project.name}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Status</label>
          <select name="status" defaultValue={project.status}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {PROJECT_STATUSES.map(s => (<option key={s} value={s}>{STATUS_LABELS[s] || s}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Client</label>
          <SearchableSelect
            name="clientId"
            options={clients.map(c => ({ value: c.id, label: c.user.name }))}
            placeholder="Search client..."
            defaultValue={project.clientId || ""}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">City</label>
          <SearchableSelect
            name="cityId"
            options={cities.map(c => ({ value: c.id, label: c.name }))}
            placeholder="Search city..."
            defaultValue={project.cityId || ""}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Grade Level</label>
          <select name="gradeLevel" defaultValue={project.gradeLevel}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.entries(GRADE_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">School</label>
          <input type="text" name="school" defaultValue={project.school || ""}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Subjects</label>
          <input type="text" name="subjects" defaultValue={project.subjects || ""}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
          <textarea name="description" rows={2} defaultValue={project.description || ""}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Save Changes</button>
          <form action="/api/projects/update" method="POST" onSubmit={e => { if (!confirm("Delete this project permanently?")) e.preventDefault() }}>
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="_action" value="delete" />
            <button type="submit" className="text-sm text-red-600 dark:text-red-400 hover:underline">Delete Project</button>
          </form>
        </div>
      </form>
    </div>
  )
}
