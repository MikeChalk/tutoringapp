"use client"

import { useState } from "react"

export function EditableRate({ id, rate, type }: { id: string; rate: number; type: "billing" | "payscale" }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(rate)

  if (!editing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">${rate.toFixed(2)}</span>
        <button onClick={() => setEditing(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-1">Edit</button>
      </div>
    )
  }

  return (
    <form action="/api/rates" method="POST" className="inline-flex items-center gap-1">
      <input type="hidden" name="type" value={type === "billing" ? "updateBilling" : "updatePayScale"} />
      <input type="hidden" name="id" value={id} />
      <input type="number" name="rate" value={value} onChange={e => setValue(parseFloat(e.target.value) || 0)} min={0} step={0.01}
        className="w-20 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      <button type="submit" className="text-xs text-green-600 dark:text-green-400 hover:underline">Save</button>
      <button type="button" onClick={() => { setEditing(false); setValue(rate) }} className="text-xs text-zinc-400 hover:text-zinc-600">Cancel</button>
    </form>
  )
}
