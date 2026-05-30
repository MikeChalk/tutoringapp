"use client"

import SearchableSelect from "@/components/searchable-select"

interface Project {
  id: string
  name: string
}

export default function AddExpenseForm({ projects }: { projects: Project[] }) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Add Expense</h3>
      <form action="/api/expenses" method="POST" encType="multipart/form-data" className="flex flex-col gap-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Description</label>
          <input type="text" name="description" required className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Amount ($)</label>
            <input type="number" name="amount" required min="0" step="0.01" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Category</label>
            <select name="category" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="OTHER">Other</option>
              <option value="SOFTWARE">Software</option>
              <option value="MARKETING">Marketing</option>
              <option value="SUPPLIES">Supplies</option>
              <option value="RENT">Rent</option>
              <option value="TRAVEL">Travel</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Project</label>
            <SearchableSelect
              name="projectId"
              options={projects.map(p => ({ value: p.id, label: p.name }))}
              placeholder="Search project..."
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Date</label>
            <input type="date" name="date" required defaultValue={new Date().toISOString().split("T")[0]} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Receipt (optional)</label>
          <input type="file" name="receipt" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 dark:file:bg-zinc-700 file:px-3 file:py-1 file:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" className="w-full rounded-lg bg-zinc-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity">Add Expense</button>
      </form>
    </div>
  )
}
