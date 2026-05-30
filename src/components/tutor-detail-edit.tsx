"use client"

import { useState } from "react"
import { TENURE_LABELS, GRADE_LABELS } from "@/lib/constants"

interface TutorDetailEditProps {
  tutor: {
    id: string
    tenure: string
    gradeLevels: string | null
    subjects: string | null
    bio: string | null
    phone: string | null
    isActive: boolean
  }
}

export default function TutorDetailEdit({ tutor }: TutorDetailEditProps) {
  const [editing, setEditing] = useState(false)

  const tenureOptions = Object.entries(TENURE_LABELS).map(([k, v]) => (
    <option key={k} value={k}>{v}</option>
  ))

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Profile</h3>
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
        ) : (
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-zinc-500 hover:underline">Cancel</button>
        )}
      </div>

      {editing ? (
        <form action="/api/tutors/edit" method="POST" className="space-y-3">
          <input type="hidden" name="tutorId" value={tutor.id} />
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Tenure</label>
            <select name="tenure" defaultValue={tutor.tenure} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {tenureOptions}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Grade Levels (comma-separated)</label>
            <input type="text" name="gradeLevels" defaultValue={tutor.gradeLevels || ""} placeholder="e.g. ELEMENTARY,SEC1_2,SEC3" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Subjects</label>
            <input type="text" name="subjects" defaultValue={tutor.subjects || ""} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Phone</label>
            <input type="text" name="phone" defaultValue={tutor.phone || ""} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Bio</label>
            <textarea name="bio" rows={3} defaultValue={tutor.bio || ""} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Save Changes</button>
        </form>
      ) : (
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Tenure</dt>
            <dd className="text-zinc-900 dark:text-zinc-100 font-medium">{TENURE_LABELS[tutor.tenure] || tutor.tenure}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Grades</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{tutor.gradeLevels ? tutor.gradeLevels.split(",").map(g => GRADE_LABELS[g] || g).join(", ") : "-"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Subjects</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{tutor.subjects || "-"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Status</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {tutor.isActive ? "Active" : "Inactive"}
            </dd>
          </div>
          {tutor.bio && (
            <div>
              <dt className="text-zinc-500 mb-1">Bio</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{tutor.bio}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}