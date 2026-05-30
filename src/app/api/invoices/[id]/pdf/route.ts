import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: { include: { user: { select: { name: true, email: true } } } },
      items: true,
    },
  })

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const settings = await prisma.companySettings.findUnique({ where: { id: "main" } })
  const companyName = settings?.name || "J.A.S.S. Tutoring"
  const companyAddress = settings?.address || ""
  const companyEmail = settings?.email || ""
  const companyPhone = settings?.phone || ""

  const itemsHtml = invoice.items.map(item =>
    `<tr><td style="padding:4px 8px;border-bottom:1px solid #e5e5e5;text-align:left">${item.description}</td><td style="padding:4px 8px;border-bottom:1px solid #e5e5e5;text-align:right">${item.hours > 0 ? item.hours : ""}</td><td style="padding:4px 8px;border-bottom:1px solid #e5e5e5;text-align:right">${item.rate > 0 ? `$${item.rate.toFixed(2)}` : ""}</td><td style="padding:4px 8px;border-bottom:1px solid #e5e5e5;text-align:right">$${item.amount.toFixed(2)}</td></tr>`
  ).join("")

  const taxRow = invoice.taxRate > 0
    ? `<tr><td colspan="3" style="padding:4px 8px;text-align:right;color:#666">Tax (${invoice.taxRate}%)</td><td style="padding:4px 8px;text-align:right">$${invoice.taxAmount.toFixed(2)}</td></tr>`
    : ""

  const discountRow = invoice.discountAmount > 0
    ? `<tr><td colspan="3" style="padding:4px 8px;text-align:right;color:#dc2626">Discount${invoice.discountCode ? ` (${invoice.discountCode})` : ""}</td><td style="padding:4px 8px;text-align:right;color:#dc2626">-$${invoice.discountAmount.toFixed(2)}</td></tr>`
    : ""

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${invoice.number}</title>
<style>body{font-family:Arial,sans-serif;margin:40px;color:#333;font-size:13px}
.header{margin-bottom:24px}.header h1{font-size:20px;margin:0 0 4px}.header p{margin:2px 0;color:#666}
.client{margin-bottom:24px}.client h2{font-size:14px;margin:0 0 4px}
table{width:100%;border-collapse:collapse;margin:16px 0}
th{background:#f5f5f5;text-align:left;padding:8px;font-size:11px;text-transform:uppercase;color:#666}
.total{font-weight:bold;font-size:14px}.footer{margin-top:32px;border-top:1px solid #e5e5e5;padding-top:12px;font-size:11px;color:#999}
</style></head><body>
<div class="header"><h1>${companyName}</h1><p>${companyAddress}</p><p>${companyEmail}${companyPhone ? " · " + companyPhone : ""}</p></div>
<div class="client"><h2>Invoice ${invoice.number}</h2><p>Bill to: ${invoice.client.user.name} · ${invoice.client.user.email}</p><p>Date: ${new Date().toLocaleDateString()} · Due: ${new Date(invoice.dueDate).toLocaleDateString()}</p><p>Status: ${invoice.status}</p></div>
<table><thead><tr><th>Description</th><th style="text-align:right">Hours</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead><tbody>${itemsHtml}${taxRow}${discountRow}<tr class="total"><td colspan="3" style="padding:8px;text-align:right">Total</td><td style="padding:8px;text-align:right">$${invoice.totalAmount.toFixed(2)}</td></tr></tbody></table>
<div class="footer"><p>${settings?.invoiceNotes || "Thank you for your business!"}</p>${settings?.taxNumber ? `<p>Tax ID: ${settings.taxNumber}</p>` : ""}</div>
</body></html>`

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html", "Content-Disposition": `attachment; filename=${invoice.number}.html` },
  })
}
