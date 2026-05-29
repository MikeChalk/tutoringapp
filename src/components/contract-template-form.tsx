"use client"

import { useState } from "react"
import { STUDENT_GRADE_OPTIONS } from "@/lib/constants"

interface Template {
  id: string; name: string; type: string; yearLevel: string
  startDate: Date | string | null; endDate: Date | string | null
  terms: string; gradeLevels: string; rate: number; isDefault: boolean
}

export function ContractTemplateForm({ editing, onCancel }: {
  editing?: Template | null
  onCancel?: string
}) {
  const isEdit = !!editing
  const [selectedGrades, setSelectedGrades] = useState<string[]>(
    editing?.gradeLevels ? editing.gradeLevels.split(",").map(s => s.trim()).filter(Boolean) : []
  )

  function toggleGrade(g: string) {
    setSelectedGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }

  function fmtDate(d: Date | string | null | undefined): string {
    if (!d) return ""
    if (typeof d === "string") return d
    return d.toISOString().split("T")[0]
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        {isEdit ? "Edit Template" : "Create Template"}
      </h3>
      <form action={isEdit ? `/api/contract-templates/${editing!.id}` : "/api/contract-templates"} method="POST" className="space-y-4">
        {isEdit && <input type="hidden" name="_method" value="PUT" />}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Template Name</label>
            <input type="text" name="name" required placeholder="e.g. Private Tutoring Standard"
              defaultValue={editing?.name || ""}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Contract Type</label>
            <select name="type" required
              defaultValue={editing?.type || "PRIVATE_TUTORING"}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="PRIVATE_TUTORING">Private Tutoring</option>
              <option value="STUDY_HALL">Study Hall</option>
              <option value="PROGRAM_SUPERVISOR">Program Supervisor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Year Level</label>
            <select name="yearLevel" required
              defaultValue={editing?.yearLevel || "1ST_YEAR"}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="1ST_YEAR">Year 1</option>
              <option value="2ND_YEAR">Year 2</option>
              <option value="3RD_YEAR">Year 3</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Start Date</label>
            <input type="date" name="startDate"
              defaultValue={fmtDate(editing?.startDate)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Expiry Date</label>
            <input type="date" name="endDate"
              defaultValue={fmtDate(editing?.endDate)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Default Rate ($/hr)</label>
            <input type="number" name="rate" min="0" step="0.01"
              defaultValue={editing?.rate || 0}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-2">Grade Levels</label>
          <input type="hidden" name="gradeLevels" value={selectedGrades.join(", ")} />
          <div className="flex flex-wrap gap-2">
            {Object.entries(STUDENT_GRADE_OPTIONS).map(([key, label]) => {
              const active = selectedGrades.includes(key)
              return (
                <button key={key} type="button" onClick={() => toggleGrade(key)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    active ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white" : "border-zinc-300 text-zinc-600 hover:border-zinc-900 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400"
                  }`}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">Contract Terms</label>
          <textarea name="terms" rows={4} placeholder="Contract terms and conditions..."
            defaultValue={editing?.terms || ""}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" name="isDefault" className="rounded" defaultChecked={editing?.isDefault || false} /> Set as default
          </label>
          <button type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            {isEdit ? "Update Template" : "Create Template"}
          </button>
          {isEdit && onCancel && (
            <a href={onCancel}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
              Cancel
            </a>
          )}
        </div>
      </form>
    </div>
  )
}
