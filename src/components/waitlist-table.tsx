"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { TENURE_LABELS, GRADE_LABELS } from "@/lib/constants"

export interface WaitlistTutor {
  id: string
  userId: string
  subjects: string
  gradeLevels: string
  tenure: string
  cvToken: string | null
  phone: string | null
  currentStudies: string | null
  highSchool: string | null
  preferredFormat: string | null
  borough: string | null
  workExperience: string | null
  activity: string
  cvUploaded: boolean
  transcriptUploaded: boolean
  createdAt: string
  user: {
    name: string
    email: string
    city: { name: string } | null
  }
}

const ACTIVITY_OPTIONS = [
  "Active",
  "Inactive - Released",
  "Inactive - No Time",
  "Inactive - Other",
  "Unsure",
]

const ACTIVITY_COLORS: Record<string, string> = {
  "Active": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Inactive - Released": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "Inactive - No Time": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Inactive - Other": "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
  "Unsure": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

interface Column {
  key: string
  label: string
  defaultVisible: boolean
}

const COLUMNS: Column[] = [
  { key: "name", label: "Name", defaultVisible: true },
  { key: "email", label: "Email", defaultVisible: true },
  { key: "city", label: "City", defaultVisible: true },
  { key: "phone", label: "Phone", defaultVisible: true },
  { key: "currentStudies", label: "Current Studies", defaultVisible: false },
  { key: "highSchool", label: "High School", defaultVisible: false },
  { key: "preferredFormat", label: "Preferred Format", defaultVisible: true },
  { key: "borough", label: "Borough", defaultVisible: false },
  { key: "workExperience", label: "Work Experience", defaultVisible: false },
  { key: "year", label: "Year", defaultVisible: true },
  { key: "grades", label: "Grades", defaultVisible: true },
  { key: "subjects", label: "Subjects", defaultVisible: true },
  { key: "activity", label: "Activity", defaultVisible: true },
  { key: "cv", label: "CV", defaultVisible: true },
  { key: "transcript", label: "Transcript", defaultVisible: true },
  { key: "joined", label: "Joined", defaultVisible: true },
]

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

export default function WaitlistTable({ tutors }: { tutors: WaitlistTutor[] }) {
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
    return new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  })
  const [activityFilter, setActivityFilter] = useState<Set<string>>(new Set())
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const toggleCol = useCallback((key: string) => {
    setVisibleCols(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const toggleActivityFilter = useCallback((value: string) => {
    setActivityFilter(prev => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }, [])

  async function updateActivity(tutorId: string, activity: string) {
    setUpdatingId(tutorId)
    try {
      await fetch("/api/tutors/activity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorId, activity }),
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredTutors = activityFilter.size > 0
    ? tutors.filter(t => activityFilter.has(t.activity))
    : tutors

  return (
    <div>
      {/* Column toggles */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium text-zinc-500 uppercase mr-1">Columns:</span>
        {COLUMNS.map(col => (
          <label key={col.key} className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={visibleCols.has(col.key)}
              onChange={() => toggleCol(col.key)}
              className="rounded"
            />
            {col.label}
          </label>
        ))}
      </div>

      {/* Activity filter chips */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium text-zinc-500 uppercase mr-1">Activity:</span>
        {ACTIVITY_OPTIONS.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => toggleActivityFilter(opt)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              activityFilter.has(opt)
                ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                : "border-zinc-300 text-zinc-600 hover:border-zinc-900 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400"
            }`}
          >
            {opt}
          </button>
        ))}
        {activityFilter.size > 0 && (
          <button
            type="button"
            onClick={() => setActivityFilter(new Set())}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {filteredTutors.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
          <p className="text-zinc-500">No tutors match the current filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                {visibleCols.has("name") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">Name</th>}
                {visibleCols.has("email") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">Email</th>}
                {visibleCols.has("city") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">City</th>}
                {visibleCols.has("phone") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">Phone</th>}
                {visibleCols.has("currentStudies") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">Studies</th>}
                {visibleCols.has("highSchool") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">High School</th>}
                {visibleCols.has("preferredFormat") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">Format</th>}
                {visibleCols.has("borough") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">Borough</th>}
                {visibleCols.has("workExperience") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">Work Exp.</th>}
                {visibleCols.has("year") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">Year</th>}
                {visibleCols.has("grades") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">Grades</th>}
                {visibleCols.has("subjects") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">Subjects</th>}
                {visibleCols.has("activity") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">Activity</th>}
                {visibleCols.has("cv") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">CV</th>}
                {visibleCols.has("transcript") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">Transcript</th>}
                {visibleCols.has("joined") && <th className="text-left px-3 py-2 text-xs font-medium text-zinc-500 uppercase whitespace-nowrap">Joined</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
              {filteredTutors.map((tutor) => (
                <tr key={tutor.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                  {visibleCols.has("name") && (
                    <td className="px-3 py-2">
                      <Link href={`/dashboard/tutors/${tutor.id}`} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                        {tutor.user.name}
                      </Link>
                    </td>
                  )}
                  {visibleCols.has("email") && (
                    <td className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{tutor.user.email}</td>
                  )}
                  {visibleCols.has("city") && (
                    <td className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{tutor.user.city?.name || "-"}</td>
                  )}
                  {visibleCols.has("phone") && (
                    <td className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{tutor.phone || "-"}</td>
                  )}
                  {visibleCols.has("currentStudies") && (
                    <td className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate" title={tutor.currentStudies || undefined}>{tutor.currentStudies || "-"}</td>
                  )}
                  {visibleCols.has("highSchool") && (
                    <td className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{tutor.highSchool || "-"}</td>
                  )}
                  {visibleCols.has("preferredFormat") && (
                    <td className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{tutor.preferredFormat || "-"}</td>
                  )}
                  {visibleCols.has("borough") && (
                    <td className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{tutor.borough || "-"}</td>
                  )}
                  {visibleCols.has("workExperience") && (
                    <td className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate" title={tutor.workExperience || undefined}>{tutor.workExperience || "-"}</td>
                  )}
                  {visibleCols.has("year") && (
                    <td className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{TENURE_LABELS[tutor.tenure] || tutor.tenure}</td>
                  )}
                  {visibleCols.has("grades") && (
                    <td className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{tutor.gradeLevels ? tutor.gradeLevels.split(",").map(g => GRADE_LABELS[g] || g).join(", ") : "-"}</td>
                  )}
                  {visibleCols.has("subjects") && (
                    <td className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate" title={tutor.subjects || undefined}>{tutor.subjects || "-"}</td>
                  )}
                  {visibleCols.has("activity") && (
                    <td className="px-3 py-2">
                      <select
                        value={tutor.activity}
                        onChange={(e) => updateActivity(tutor.id, e.target.value)}
                        disabled={updatingId === tutor.id}
                        className={`text-xs rounded-full px-2.5 py-1 border-0 font-medium cursor-pointer appearance-none text-center ${ACTIVITY_COLORS[tutor.activity] || "bg-zinc-100 text-zinc-700"}`}
                      >
                        {ACTIVITY_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                  )}
                  {visibleCols.has("cv") && (
                    <td className="px-3 py-2">
                      {tutor.cvToken ? (
                        <a
                          href={`/upload/${tutor.cvToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            tutor.cvUploaded
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {tutor.cvUploaded ? "Uploaded" : "Pending"}
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-400">-</span>
                      )}
                    </td>
                  )}
                  {visibleCols.has("transcript") && (
                    <td className="px-3 py-2">
                      {tutor.cvToken ? (
                        <a
                          href={`/upload/${tutor.cvToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            tutor.transcriptUploaded
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {tutor.transcriptUploaded ? "Uploaded" : "Pending"}
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-400">-</span>
                      )}
                    </td>
                  )}
                  {visibleCols.has("joined") && (
                    <td className="px-3 py-2 text-sm text-zinc-500 whitespace-nowrap">{formatDate(tutor.createdAt)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
