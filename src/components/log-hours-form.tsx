"use client"

import SearchableSelect from "@/components/searchable-select"

interface Tutor { id: string; user: { name: string }; tenure: string }
interface Project { id: string; name: string; client: { user: { name: string } } | null; gradeLevel: string }
import { GRADE_LABELS } from "@/lib/constants"

export function LogHoursForm({ tutors, projects }: { tutors: Tutor[]; projects: Project[] }) {
  return (
    <form action="/api/hours" method="POST" className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 space-y-4">
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Tutor</label>
        <SearchableSelect
          name="tutorId"
          options={tutors.map(t => ({ value: t.id, label: `${t.user.name} (${t.tenure})` }))}
          placeholder="Search tutor..."
          required
        />
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Project</label>
        <SearchableSelect
          name="projectId"
          options={projects.map(p => ({ value: p.id, label: `${p.name} — ${p.client?.user?.name || "N/A"} (${GRADE_LABELS[p.gradeLevel] || p.gradeLevel})` }))}
          placeholder="Search project..."
          required
        />
      </div>
      <input type="hidden" name="date" value={new Date().toISOString().split("T")[0]} />
      <input type="hidden" name="hours" value="1" />
      <input type="hidden" name="mode" value="IN_PERSON" />
      <input type="hidden" name="description" value="" />
      <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
        + Quick Log (1 hour)
      </button>
    </form>
  )
}
