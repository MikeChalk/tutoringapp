"use client"

import { useState, useMemo } from "react"
import Link from "next/link"

interface ClientRow {
  id: string
  name: string
  email: string
  city: string
  type: string
  typeLabel: string
  phone: string
  projects: number
  invoices: number
}

interface ClientsTableProps {
  data: ClientRow[]
  showAdminColumns: boolean
}

export default function ClientsTable({ data, showAdminColumns }: ClientsTableProps) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<string>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const filtered = useMemo(() => {
    let result = data
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((row) =>
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.city.toLowerCase().includes(q)
      )
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey as keyof ClientRow]
        const bVal = b[sortKey as keyof ClientRow]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1
        const aNum = Number(aVal)
        const bNum = Number(bVal)
        if (!isNaN(aNum) && !isNaN(bNum)) return sortDir === "asc" ? aNum - bNum : bNum - aNum
        return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal))
      })
    }
    return result
  }, [data, search, sortKey, sortDir])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search clients..."
        className="mb-3 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th onClick={() => handleSort("name")} className="text-left px-4 py-3 text-xs font-medium text-zinc-500 cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-300 uppercase">Name {sortKey === "name" && <span className="text-[10px] ml-0.5">{sortDir === "asc" ? "▲" : "▼"}</span>}</th>
              <th onClick={() => handleSort("email")} className="text-left px-4 py-3 text-xs font-medium text-zinc-500 cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-300 uppercase">Email {sortKey === "email" && <span className="text-[10px] ml-0.5">{sortDir === "asc" ? "▲" : "▼"}</span>}</th>
              <th onClick={() => handleSort("city")} className="text-left px-4 py-3 text-xs font-medium text-zinc-500 cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-300 uppercase">City {sortKey === "city" && <span className="text-[10px] ml-0.5">{sortDir === "asc" ? "▲" : "▼"}</span>}</th>
              <th onClick={() => handleSort("type")} className="text-left px-4 py-3 text-xs font-medium text-zinc-500 cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-300 uppercase">Type {sortKey === "type" && <span className="text-[10px] ml-0.5">{sortDir === "asc" ? "▲" : "▼"}</span>}</th>
              {showAdminColumns && <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Phone</th>}
              {showAdminColumns && <th onClick={() => handleSort("projects")} className="text-left px-4 py-3 text-xs font-medium text-zinc-500 cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-300 uppercase">Projects {sortKey === "projects" && <span className="text-[10px] ml-0.5">{sortDir === "asc" ? "▲" : "▼"}</span>}</th>}
              {showAdminColumns && <th onClick={() => handleSort("invoices")} className="text-left px-4 py-3 text-xs font-medium text-zinc-500 cursor-pointer select-none hover:text-zinc-700 dark:hover:text-zinc-300 uppercase">Invoices {sortKey === "invoices" && <span className="text-[10px] ml-0.5">{sortDir === "asc" ? "▲" : "▼"}</span>}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
            {filtered.length === 0 ? (
              <tr><td colSpan={showAdminColumns ? 7 : 4} className="px-4 py-8 text-center text-sm text-zinc-500">No clients found.</td></tr>
            ) : (
              filtered.map((client) => (
                <tr key={client.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/clients/${client.id}`} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{client.email}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{client.city}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${
                      client.type === "SCHOOL" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {client.typeLabel}
                    </span>
                  </td>
                  {showAdminColumns && <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{client.phone}</td>}
                  {showAdminColumns && <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{client.projects}</td>}
                  {showAdminColumns && <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{client.invoices}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-zinc-400 mt-2">Showing {filtered.length} of {data.length} entries</div>
    </div>
  )
}