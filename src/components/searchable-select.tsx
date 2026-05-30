"use client"

import { useState, useRef, useEffect, useMemo, useDeferredValue } from "react"

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  name: string
  options: SelectOption[]
  defaultValue?: string
  placeholder?: string
  required?: boolean
  className?: string
  onChange?: (value: string) => void
}

export default function SearchableSelect({
  name,
  options,
  defaultValue = "",
  placeholder = "Search...",
  required = false,
  className = "",
  onChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(() => {
    if (defaultValue) {
      const match = options.find(o => o.value === defaultValue)
      return match?.label || ""
    }
    return ""
  })
  const [selectedValue, setSelectedValue] = useState(defaultValue)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const deferredSearch = useDeferredValue(search)

  const filtered = useMemo(() =>
    options.filter(o =>
      o.label.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      o.value.toLowerCase().includes(deferredSearch.toLowerCase())
    ).slice(0, 50),
    [options, deferredSearch]
  )

  function select(opt: SelectOption) {
    setSelectedValue(opt.value)
    setSearch(opt.label)
    setOpen(false)
    onChange?.(opt.value)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setSelectedValue("")
    onChange?.("")
    setOpen(true)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input type="hidden" name={name} value={selectedValue} />
      <input
        type="text"
        value={search}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        required={required && !selectedValue}
        autoComplete="off"
        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => select(opt)}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
                opt.value === selectedValue
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && search.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg px-3 py-2 text-sm text-zinc-400">
          No results
        </div>
      )}
    </div>
  )
}
