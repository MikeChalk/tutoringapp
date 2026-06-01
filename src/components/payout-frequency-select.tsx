"use client"

const FREQUENCIES = [
  { value: "manual", label: "Manual" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
]

export function PayoutFrequencySelect({ defaultValue }: { defaultValue: string }) {
  return (
    <form action="/api/settings/payout-frequency" method="POST" className="flex items-center gap-2">
      <label className="text-xs text-zinc-500">Payout:</label>
      <select name="frequency" defaultValue={defaultValue} onChange={(e) => (e.target.form as HTMLFormElement).requestSubmit()}
        className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
    </form>
  )
}
