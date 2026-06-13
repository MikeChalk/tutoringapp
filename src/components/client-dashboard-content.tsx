"use client"

import Link from "next/link"
import ScrollReveal from "@/components/scroll-reveal"
import { Users, FileText, Settings } from "lucide-react"
import { INVOICE_STATUS_COLORS } from "@/lib/constants"

interface InvoiceRow {
  id: string
  number: string
  status: string
  totalAmount: number
  dueDate: string
  paidAt: string | null
}

interface ClientDashboardContentProps {
  greeting: string
  subline: string | null
  unpaidInvoices: InvoiceRow[]
  paidInvoices: InvoiceRow[]
}

const CLIENT_NAV_TILES = [
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/projects", label: "My Students", icon: Users },
  { href: "/dashboard/profile", label: "Profile", icon: Settings },
]

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date()
}

export default function ClientDashboardContent({
  greeting,
  subline,
  unpaidInvoices,
  paidInvoices,
}: ClientDashboardContentProps) {
  return (
    <div className="font-[family-name:var(--font-inter)] -m-4 lg:-m-8 min-h-screen bg-[#F4F6F8]">
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-5">

        <ScrollReveal delay={0}>
          <div>
            <h1 className="text-3xl font-bold text-[#1E3A5F]">{greeting}</h1>
            {subline && <p className="text-sm text-[#5B7B9A] mt-1">{subline}</p>}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <div>
            <h2 className="text-base font-semibold text-[#1E3A5F] mb-3">To Pay</h2>
            {unpaidInvoices.length > 0 ? (
              <div className="space-y-2">
                {unpaidInvoices.map((inv) => {
                  const overdue = isOverdue(inv.dueDate)
                  return (
                    <Link
                      key={inv.id}
                      href={`/dashboard/invoices/${inv.id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-xl border border-[#e3e7eb] p-4 hover:border-[#1E3A5F]/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${INVOICE_STATUS_COLORS[inv.status] || "bg-zinc-100 text-zinc-600"}`}>
                          {inv.status === "OVERDUE" ? "Overdue" : "Unpaid"}
                        </div>
                        <span className="text-sm font-medium text-[#1E3A5F] truncate">{inv.number}</span>
                        <span className={`text-xs ${overdue ? "text-amber-600 font-medium" : "text-[#5B7B9A]"}`}>
                          Due {formatDate(inv.dueDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 sm:mt-0">
                        <span className="text-sm font-semibold text-[#1E3A5F]">{formatCurrency(inv.totalAmount)}</span>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-200 text-zinc-500 px-3 py-1.5 text-xs font-medium cursor-default select-none">
                          Pay — coming soon
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#e3e7eb] p-5 text-center">
                <p className="text-sm text-[#5B7B9A]">You&apos;re all paid up</p>
              </div>
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
            <div>
              <h2 className="text-base font-semibold text-[#1E3A5F] mb-3">Payment History</h2>
              {paidInvoices.length > 0 ? (
              <div className="space-y-2">
                {paidInvoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/dashboard/invoices/${inv.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-xl border border-[#e3e7eb] p-4 hover:border-[#1E3A5F]/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex text-xs font-medium rounded-full px-2 py-0.5 bg-green-100 text-green-700">Paid</span>
                      <span className="text-sm font-medium text-[#1E3A5F] truncate">{inv.number}</span>
                      <span className="text-xs text-[#5B7B9A]">
                        {inv.paidAt ? `Paid ${formatDate(inv.paidAt)}` : ""}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-[#1E3A5F] mt-2 sm:mt-0">{formatCurrency(inv.totalAmount)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#e3e7eb] p-5 text-center">
                <p className="text-sm text-[#5B7B9A]">No payment history yet</p>
              </div>
            )}
            </div>
          </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CLIENT_NAV_TILES.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="bg-white rounded-xl border border-[#e3e7eb] p-4 flex flex-col items-center gap-2 hover:border-[#1E3A5F]/30 transition-colors"
              >
                <Icon className="w-5 h-5 text-[#1E3A5F]" />
                <span className="text-sm font-medium text-[#1E3A5F]">{label}</span>
              </Link>
            ))}
          </div>
        </ScrollReveal>

      </div>
    </div>
  )
}