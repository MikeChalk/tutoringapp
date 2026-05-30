"use client"

import { useState } from "react"
import AddExpenseForm from "@/components/add-expense-form"

interface Client { id: string; user: { name: string } }

export default function AddExpenseSection({ clients }: { clients: Client[] }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="mb-6">
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
        >
          + Add Expense
        </button>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-500">New Expense</span>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-zinc-400 hover:text-zinc-600">Cancel</button>
          </div>
          <AddExpenseForm clients={clients} />
        </div>
      )}
    </div>
  )
}
