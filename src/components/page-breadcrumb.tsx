import React from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function PageBreadcrumb({
  items,
}: {
  items: { label: string; href?: string }[]
}) {
  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
              ) : (
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
              )}
            </BreadcrumbItem>
            {i < items.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
