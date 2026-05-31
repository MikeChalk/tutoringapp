"use client"

import { useTheme } from "@/components/theme-provider"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, toggle } = useTheme()

  if (theme === "dark") {
    return (
      <Button variant="ghost" size="sm" onClick={toggle} className="h-8 w-8 p-0">
        <Sun className="h-4 w-4" />
        <span className="sr-only">Light mode</span>
      </Button>
    )
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="h-8 w-8 p-0">
      <Moon className="h-4 w-4" />
      <span className="sr-only">Dark mode</span>
    </Button>
  )
}
