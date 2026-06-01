"use client"

import { useState, useEffect } from "react"
import SearchableSelect from "@/components/searchable-select"

interface Client { id: string; user: { name: string } }

interface LineItem {
  description: string; hours: number; rate: number; amount: number
}

export function CreateInvoiceForm({ clients }: { clients: Client[] }) {
  const [showForm, setShowForm] = useState(false)
  const [lines, setLines] = useState<LineItem[]>([{ description: "", hours: 1, rate: 0, amount: 0 }])
  const [taxRate, setTaxRate] = useState(0)
  const [notes, setNotes] = useState("")
  const [discountCode, setDiscountCode] = useState("")
  const [discountPct, setDiscountPct] = useState(0)
  const [discountAmt, setDiscountAmt] = useState(0)
  const [defaultDueDate] = useState(() => new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0])
  const [codes, setCodes] = useState<Array<{ code: string; discountPct: number; discountAmt: number }>>([])

  useEffect(() => {
    fetch("/api/discounts").then(r => r.json()).then(d => setCodes(d.codes || []))
  }, [])

  function applyCode(code: string) {
    setDiscountCode(code)
    const c = codes.find(x => x.code === code)
    if (c) {
      setDiscountPct(c.discountPct)
      setDiscountAmt(c.discountAmt)
    } else {
      setDiscountPct(0)
      setDiscountAmt(0)
    }
  }

  const subtotal = lines.reduce((s, l) => s + l.amount, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const pctDisc = subtotal * (discountPct / 100)
  const discAmt = pctDisc + discountAmt
  const total = Math.max(0, subtotal + taxAmount - discAmt)

  function updateLine(idx: number, field: keyof LineItem, value: string) {
    setLines(prev => {
      const next = [...prev]
      if (field === "hours" || field === "rate") {
        next[idx][field] = parseFloat(value) || 0
        next[idx].amount = next[idx].hours * next[idx].rate
      } else if (field === "description") {
        next[idx].description = value
      }
      return next
    })
  }

  function addLine() {
    setLines(prev => [...prev, { description: "", hours: 1, rate: 0, amount: 0 }])
  }

  function removeLine(idx: number) {
    if (lines.length === 1) return
    setLines(prev => prev.filter((_, i) => i !== idx))
  }

  if (!showForm) {
    return (
      <button id="create-invoice" onClick={() => setShowForm(true)}
        className="mb-6 w-full rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 p-4 text-sm font-medium text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
        + Create Invoice
      </button>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Create Invoice</h3>
        <button onClick={() => setShowForm(false)} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">Cancel</button>
      </div>

      <form action="/api/invoices" method="POST" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Client</label>
            <SearchableSelect
              name="clientId"
              options={clients.map(c => ({ value: c.id, label: c.user.name }))}
              placeholder="Search client..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Date</label>
            <input type="date" name="date" defaultValue={new Date().toISOString().split("T")[0]} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Due Date</label>
            <input type="date" name="dueDate" defaultValue={defaultDueDate} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Line Items</label>
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input type="text" placeholder="Description" value={line.description}
                  onChange={e => updateLine(idx, "description", e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="number" placeholder="Hrs" value={line.hours || ""}
                  onChange={e => updateLine(idx, "hours", e.target.value)} step="0.25" min="0"
                  className="w-16 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="number" placeholder="$/hr" value={line.rate || ""}
                  onChange={e => updateLine(idx, "rate", e.target.value)} step="0.01" min="0"
                  className="w-20 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400 w-20 text-right">${line.amount.toFixed(2)}</span>
                {lines.length > 1 && (
                  <button type="button" onClick={() => removeLine(idx)} className="text-xs text-red-600 dark:text-red-400 hover:underline shrink-0">×</button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addLine} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2">+ Add line</button>

          <input type="hidden" name="lines" value={JSON.stringify(lines)} />
          <input type="hidden" name="subtotal" value={subtotal.toFixed(2)} />
          <input type="hidden" name="taxRate" value={taxRate.toFixed(1)} />
          <input type="hidden" name="taxAmount" value={taxAmount.toFixed(2)} />
          <input type="hidden" name="totalAmount" value={total.toFixed(2)} />
          <input type="hidden" name="discountCode" value={discountCode} />
          <input type="hidden" name="discountAmount" value={discAmt.toFixed(2)} />
        </div>

        {/* Totals */}
        <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 space-y-1 text-sm">
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {(pctDisc > 0 || discountAmt > 0) && (
            <div className="flex justify-between text-red-600 dark:text-red-400">
              <span>Discount {discountCode ? `(${discountCode})` : ""}{pctDisc > 0 ? ` ${discountPct}%` : ""}{discountAmt > 0 ? ` $${discountAmt.toFixed(2)}` : ""}</span>
              <span>-${discAmt.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-zinc-600 dark:text-zinc-400">Tax</span>
              <input type="number" value={taxRate || ""} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                placeholder="0" step="0.1" min="0" max="100"
                className="w-16 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <span className="text-zinc-500">%</span>
            </div>
            <span className="text-zinc-600 dark:text-zinc-400">${taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-zinc-900 dark:text-zinc-100 pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {codes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Discount Code</label>
            <select value={discountCode} onChange={e => applyCode(e.target.value)} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">None</option>
              {codes.map(c => (<option key={c.code} value={c.code}>{c.code} ({c.discountPct > 0 ? `${c.discountPct}%` : `$${c.discountAmt}`})</option>))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Custom Discount %</label>
            <input type="number" value={discountPct || ""} onChange={e => { setDiscountPct(parseFloat(e.target.value) || 0); setDiscountCode("") }}
              placeholder="0" step="0.1" min="0" max="100"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">or Custom $ Off</label>
            <input type="number" value={discountAmt || ""} onChange={e => { setDiscountAmt(parseFloat(e.target.value) || 0); setDiscountCode("") }}
              placeholder="0" step="0.01" min="0"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Notes</label>
          <textarea name="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Payment instructions or additional notes..."
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <button type="submit" className="rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity">
          Create Invoice
        </button>
      </form>
    </div>
  )
}
