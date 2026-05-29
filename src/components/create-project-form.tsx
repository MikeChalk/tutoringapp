"use client"

import { useState } from "react"
import { GRADE_LABELS, SUBJECT_OPTIONS } from "@/lib/constants"

interface Client {
  id: string; user: { name: string }
}

interface City {
  id: string; name: string
}

export function CreateProjectForm({ clients, cities, defaultType, defaultCity }: {
  clients: Client[]
  cities: City[]
  defaultType: string
  defaultCity: string
}) {
  const [projectType, setProjectType] = useState(defaultType)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [otherSubject, setOtherSubject] = useState("")
  const isStudent = projectType === "STUDENT"

  function toggleSubject(subject: string) {
    setSelectedSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    )
  }

  const subjectsValue = isStudent
    ? [...selectedSubjects, otherSubject.trim()].filter(Boolean).join(", ")
    : undefined

  return (
    <details className="mb-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 select-none">
        + Create Project
      </summary>

      <form action="/api/projects" method="POST" className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Row 1: Type + Name */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Project Type</label>
          <select
            name="projectType"
            value={projectType}
            onChange={e => { setProjectType(e.target.value); setSelectedSubjects([]); setOtherSubject("") }}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="STUDENT">Private Tutoring</option>
            <option value="STUDY_HALL">Study Hall / Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">Project Name</label>
          <input
            type="text" name="name" required
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Row 2: Client (always) + Grade (tutoring only) / School (study hall only) */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Client</label>
          <select
            name="clientId"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No client</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.user.name}</option>
            ))}
          </select>
        </div>

        {isStudent ? (
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Grade Level</label>
            <select
              name="gradeLevel"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(GRADE_LABELS).filter(([k]) => k !== "STUDY_HALL" && k !== "PROGRAM_SUPERVISOR").map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Subtype</label>
              <select
                name="gradeLevel"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="STUDY_HALL">{GRADE_LABELS.STUDY_HALL}</option>
                <option value="PROGRAM_SUPERVISOR">{GRADE_LABELS.PROGRAM_SUPERVISOR}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">School</label>
              <input
                type="text" name="school"
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        {/* Row 3: City */}
        <div className="sm:col-span-2">
          <label className="block text-xs text-zinc-500 mb-1">City</label>
          <select
            name="cityId"
            defaultValue={defaultCity !== "all" ? defaultCity : ""}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">None</option>
            {cities.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Subjects */}
        {isStudent ? (
          <div className="sm:col-span-2">
            <label className="block text-xs text-zinc-500 mb-2">Subjects</label>
            <input type="hidden" name="subjects" value={subjectsValue} />
            <div className="flex flex-wrap gap-2 mb-2">
              {SUBJECT_OPTIONS.map(subject => {
                const active = selectedSubjects.includes(subject)
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white"
                        : "border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-zinc-900 dark:hover:border-white"
                    }`}
                  >
                    {subject}
                  </button>
                )
              })}
            </div>
            <input
              type="text"
              placeholder="Other subject..."
              value={otherSubject}
              onChange={e => setOtherSubject(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label className="block text-xs text-zinc-500 mb-1">Subjects (comma separated)</label>
            <input
              type="text" name="subjects"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Row: Description */}
        <div className="sm:col-span-2">
          <label className="block text-xs text-zinc-500 mb-1">Description</label>
          <textarea
            name="description" rows={2}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit */}
        <div className="sm:col-span-2">
          <button type="submit"
            className="rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity">
            Create Project
          </button>
        </div>
      </form>
    </details>
  )
}
