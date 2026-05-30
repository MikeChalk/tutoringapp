"use client"

import { useState } from "react"

interface EditHourLogProps {
  id: string
  hours: number
  date: string
  mode: string
  billingRate: number
  tutorPayRate: number
  description: string | null
}

export default function EditHourLog({ id, hours, date, mode, billingRate, tutorPayRate, description }: EditHourLogProps) {
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
        Edit
      </button>
    )
  }

  return (
    <form action={`/api/hours/${id}`} method="POST" className="inline-flex flex-wrap items-center gap-1">
      <input type="hidden" name="_action" value="edit" />
      <input type="number" name="hours" defaultValue={hours} min="0.25" step="0.25" className="w-16 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1 py-0.5 text-xs" title="Hours" />
      <input type="date" name="date" defaultValue={date} className="w-28 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1 py-0.5 text-xs" />
      <select name="mode" defaultValue={mode} className="w-20 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1 py-0.5 text-xs">
        <option value="IN_PERSON">In Person</option>
        <option value="ONLINE">Online</option>
      </select>
      <input type="number" name="billingRate" defaultValue={billingRate} min="0" step="0.01" className="w-16 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1 py-0.5 text-xs" title="Billing $" />
      <input type="number" name="tutorPayRate" defaultValue={tutorPayRate} min="0" step="0.01" className="w-16 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1 py-0.5 text-xs" title="Pay $" />
      <input type="text" name="description" defaultValue={description || ""} placeholder="Notes" className="w-24 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1 py-0.5 text-xs" />
      <button type="submit" className="text-xs px-1.5 py-0.5 rounded bg-green-600 text-white hover:bg-green-700">Save</button>
      <button type="button" onClick={() => setEditing(false)} className="text-xs text-zinc-400 hover:text-zinc-600">Cancel</button>
    </form>
  )
}
