"use client"

export default function ImpersonateButton({ userId }: { userId: string }) {
  return (
    <form action="/api/admin/impersonate" method="POST">
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
        Impersonate
      </button>
    </form>
  )
}