"use client"

import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    google?: { maps: { places: { Autocomplete: new (input: HTMLInputElement) => { addListener(event: string, callback: () => void): void; getPlace(): { formatted_address?: string } } } } }
    initAddressAutocomplete?: () => void
  }
}

export function AddressAutocomplete({ id, name, defaultValue, className }: {
  id?: string; name?: string; defaultValue?: string; className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(defaultValue || "")
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    if (!key || !inputRef.current) return

    const scriptId = "google-maps-script"
    if (document.getElementById(scriptId)) {
      initAutocomplete()
      return
    }

    const script = document.createElement("script")
    script.id = scriptId
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
    script.async = true
    script.defer = true
    window.initAddressAutocomplete = initAutocomplete
    script.onload = () => initAutocomplete()

    document.head.appendChild(script)

    function initAutocomplete() {
      if (!inputRef.current || !window.google) return
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current)
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace()
        if (place.formatted_address) {
          setValue(place.formatted_address)
        }
      })
    }

    return () => {
      document.getElementById(scriptId)?.remove()
    }
  }, [key])

  return (
    <div>
      <input ref={inputRef} type="text" name={name} id={id} value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Start typing an address..."
        className={className || "w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"} />
      {!key && <p className="text-xs text-zinc-400 mt-1">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for address autocomplete</p>}
    </div>
  )
}
