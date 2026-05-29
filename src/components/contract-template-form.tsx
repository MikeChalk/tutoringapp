"use client"

import { useState } from "react"
import { STUDENT_GRADE_OPTIONS } from "@/lib/constants"

interface Template {
  id: string; name: string; type: string; yearLevel: string
  startDate: Date | string | null; endDate: Date | string | null
  terms: string; gradeLevels: string; rates: string; isDefault: boolean
}

const PROGRAM_CATEGORIES: Record<string, string> = {
  in_person_mgmt: "In-Person Program Management",
  online_mgmt: "Online Program Management",
  supervision: "Supervision",
  marketing: "Marketing",
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return ""
  if (typeof d === "string") return d
  return d.toISOString().split("T")[0]
}

export function ContractTemplateForm({ editing, onCancel }: {
  editing?: Template | null
  onCancel?: string
}) {
  const isEdit = !!editing
  const [contractType, setContractType] = useState(editing?.type || "PRIVATE_TUTORING")
  const isProgramSupervisor = contractType === "PROGRAM_SUPERVISOR"

  const existingRates: Record<string, number> = {}
  const existingCustom: Array<{ label: string; rate: number }> = []
  if (editing?.rates) {
    try {
      const parsed = JSON.parse(editing.rates)
      for (const [k, v] of Object.entries(parsed)) {
        if (k === "custom") {
          if (Array.isArray(v)) existingCustom.push(...v)
        } else {
          existingRates[k] = v as number
        }
      }
    } catch {}
  }

  const [customCategories, setCustomCategories] = useState<Array<{ label: string; rate: number }>>(existingCustom)

  const rateKeys = isProgramSupervisor
    ? [...Object.keys(STUDENT_GRADE_OPTIONS), "STUDY_HALL", ...Object.keys(PROGRAM_CATEGORIES)]
    : [...Object.keys(STUDENT_GRADE_OPTIONS), "STUDY_HALL"]

  const rateLabels: Record<string, string> = {
    ...STUDENT_GRADE_OPTIONS,
    STUDY_HALL: "Study Hall Tutor",
    ...PROGRAM_CATEGORIES,
  }

  function serializeRates(): string {
    const obj: Record<string, unknown> = {}
    for (const k of rateKeys) {
      const input = document.getElementById(`rate_${k}`) as HTMLInputElement
      const val = input ? parseFloat(input.value) : existingRates[k] || 0
      if (val > 0) obj[k] = val
    }
    if (customCategories.length > 0) {
      obj.custom = customCategories.filter(c => c.label && c.rate > 0)
    }
    return JSON.stringify(obj)
  }

  function addCustom() {
    setCustomCategories(prev => [...prev, { label: "", rate: 0 }])
  }

  function removeCustom(idx: number) {
    setCustomCategories(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        {isEdit ? "Edit Template" : "Create Template"}
      </h3>
      <form action={isEdit ? `/api/contract-templates/${editing!.id}` : "/api/contract-templates"} method="POST"
        onSubmit={(e) => {
          const input = document.createElement("input")
          input.type = "hidden"
          input.name = "rates"
          input.value = serializeRates()
          ;(e.target as HTMLFormElement).appendChild(input)
        }}
        className="space-y-5">
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
              value={contractType}
              onChange={e => setContractType(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="PRIVATE_TUTORING">Private Tutoring</option>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-2">
            Rates by Category ($/hr)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {rateKeys.map((key) => (
              <div key={key}>
                <label className="block text-xs text-zinc-500 mb-0.5">
                  {rateLabels[key] || key}
                </label>
                <input type="number" id={`rate_${key}`} min="0" step="0.01" placeholder="0.00"
                  defaultValue={existingRates[key] || ""}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-2">Custom Categories</label>
          {customCategories.map((cat, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-2">
              <input type="text" placeholder="Category name"
                defaultValue={cat.label}
                onChange={e => {
                  setCustomCategories(prev => prev.map((c, i) => i === idx ? { ...c, label: e.target.value } : c))
                }}
                className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="number" placeholder="$/hr" min="0" step="0.01"
                defaultValue={cat.rate || ""}
                onChange={e => {
                  setCustomCategories(prev => prev.map((c, i) => i === idx ? { ...c, rate: parseFloat(e.target.value) || 0 } : c))
                }}
                className="w-24 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={() => removeCustom(idx)}
                className="text-xs text-red-600 dark:text-red-400 hover:underline shrink-0">Remove</button>
            </div>
          ))}
          <button type="button" onClick={addCustom}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            + Add custom category
          </button>
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
