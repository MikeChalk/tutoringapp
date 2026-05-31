import Link from "next/link"

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string
  description?: string
  action?: { label: string; href: string }
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3" />}
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
      {description && <p className="text-sm text-zinc-500 mt-1 max-w-sm">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex items-center rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
