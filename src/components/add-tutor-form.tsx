"use client"

import { useState, useEffect } from "react"
import { STUDENT_GRADE_OPTIONS, SUBJECT_OPTIONS } from "@/lib/constants"

interface Template { id: string; name: string }
interface City { id: string; name: string }

export function AddTutorForm({ templates, cities, onboardFlow }: { templates: Template[]; cities: City[]; onboardFlow?: boolean }) {
  const [showForm, setShowForm] = useState(false)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])
  const [otherSubject, setOtherSubject] = useState("")

  function toggleSubject(s: string) { setSelectedSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]) }
  function toggleGrade(g: string) { setSelectedGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]) }

  const subjectsValue = [...selectedSubjects, otherSubject.trim()].filter(Boolean).join(", ")
  const gradesValue = selectedGrades.join(", ")

  if (!showForm) {
    return (
      <button onClick={() => setShowForm(true)}
        className="mb-6 w-full rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 p-4 text-sm font-medium text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
        {onboardFlow ? "+ Onboard New Team Member" : "+ Add Tutor"}
      </button>
    )
  }

  const formAction = onboardFlow ? "/api/onboarding" : "/api/tutors/add"

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{onboardFlow ? "Onboard New Team Member" : "Add Tutor"}</h3>
        <button onClick={() => setShowForm(false)} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">Cancel</button>
      </div>
      <form action={formAction} method="POST" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className="block text-xs text-zinc-500 mb-1">Full Name *</label><input type="text" name="name" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-zinc-500 mb-1">Email *</label><input type="email" name="email" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-xs text-zinc-500 mb-1">Phone</label><input type="tel" name="phone" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">City</label>
            <select name="cityId" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">None</option>
              {cities.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Tenure</label>
            <select name="tenure" defaultValue="1ST_YEAR" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="1ST_YEAR">Year 1</option><option value="2ND_YEAR">Year 2</option><option value="3RD_YEAR">Year 3</option>
            </select>
          </div>
          {onboardFlow && (
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Contract Type</label>
              <select name="contractType" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="PRIVATE_TUTORING">Private Tutoring</option><option value="PROGRAM_SUPERVISOR">Program Supervisor</option>
              </select>
            </div>
          )}
          {onboardFlow && templates.length > 0 && (
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Template</label>
              <select name="templateId" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">None</option>
                {templates.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
              </select>
            </div>
          )}
        </div>

        {onboardFlow && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-zinc-500 mb-1">Start Date</label><input type="date" name="startDate" defaultValue={new Date().toISOString().split("T")[0]} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-zinc-500 mb-1">End Date</label><input type="date" name="endDate" defaultValue={new Date(new Date().getFullYear() + (new Date().getMonth() >= 6 ? 2 : 1), 6, 1).toISOString().split("T")[0]} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
        )}

        <div>
          <label className="block text-xs text-zinc-500 mb-2">Subjects</label>
          <input type="hidden" name="subjects" value={subjectsValue} />
          <div className="flex flex-wrap gap-2 mb-2">
            {SUBJECT_OPTIONS.map(s => {
              const active = selectedSubjects.includes(s)
              return (
                <button key={s} type="button" onClick={() => toggleSubject(s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white" : "border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-zinc-900 dark:hover:border-white"}`}>{s}</button>
              )
            })}
          </div>
          <input type="text" placeholder="Other subject..." value={otherSubject} onChange={e => setOtherSubject(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-2">Grade Levels</label>
          <input type="hidden" name="gradeLevels" value={gradesValue} />
          <div className="flex flex-wrap gap-2">
            {Object.entries(STUDENT_GRADE_OPTIONS).map(([key, label]) => {
              const active = selectedGrades.includes(key)
              return (
                <button key={key} type="button" onClick={() => toggleGrade(key)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white" : "border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-zinc-900 dark:hover:border-white"}`}>{label}</button>
              )
            })}
          </div>
        </div>

        <button type="submit" className="rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity">
          {onboardFlow ? "Create & Start Onboarding" : "Add Tutor"}
        </button>
      </form>
    </div>
  )
}
