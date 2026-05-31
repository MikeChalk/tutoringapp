"use client"

import { useState } from "react"

interface ClientDetailEditProps {
  client: {
    id: string
    type: string
    company: string | null
    phone: string | null
    address: string | null
    province: string | null
    country: string | null
    postalCode: string | null
    notes: string | null
    user: { name: string; email: string; city: { name: string } | null }
  }
}

export default function ClientDetailEdit({ client }: ClientDetailEditProps) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Details</h3>
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
        ) : (
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-zinc-500 hover:underline">Cancel</button>
        )}
      </div>

      {editing ? (
        <form action="/api/clients" method="POST" className="space-y-3">
          <input type="hidden" name="id" value={client.id} />
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
            <input type="text" name="name" defaultValue={client.user.name} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
            <input type="email" name="email" defaultValue={client.user.email} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Type</label>
              <select name="clientType" defaultValue={client.type} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="PARENT">Parent</option>
                <option value="SCHOOL">School</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Company</label>
              <input type="text" name="company" defaultValue={client.company || ""} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Phone</label>
            <input type="text" name="phone" defaultValue={client.phone || ""} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Address</label>
            <input type="text" name="address" defaultValue={client.address || ""} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Province</label>
              <input type="text" name="province" defaultValue={client.province || ""} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Country</label>
              <input type="text" name="country" defaultValue={client.country || ""} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Postal Code</label>
              <input type="text" name="postalCode" defaultValue={client.postalCode || ""} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Notes</label>
            <textarea name="notes" rows={3} defaultValue={client.notes || ""} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Save Changes</button>
        </form>
      ) : (
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Type</dt>
            <dd className="text-zinc-900 dark:text-zinc-100 font-medium">{client.type === "SCHOOL" ? "School" : "Parent"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Company</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{client.company || "-"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Phone</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{client.phone || "-"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Address</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{client.address || "-"}</dd>
          </div>
          {(client.province || client.country || client.postalCode) && (
            <div className="flex justify-between">
              <dt className="text-zinc-500">Region</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{[client.province, client.country, client.postalCode].filter(Boolean).join(", ") || "-"}</dd>
            </div>
          )}
          {client.notes && (
            <div>
              <dt className="text-zinc-500 mb-1">Notes</dt>
              <dd className="text-zinc-900 dark:text-zinc-100 text-xs whitespace-pre-wrap">{client.notes}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}