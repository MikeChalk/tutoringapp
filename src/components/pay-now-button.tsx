"use client"

export function PayNowButton({ invoiceId }: { invoiceId: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-200 text-zinc-500 px-3 py-1.5 text-xs font-medium cursor-default select-none">
      Pay — coming soon
    </span>
  )
}