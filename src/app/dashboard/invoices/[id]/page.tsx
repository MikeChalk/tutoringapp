import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, isClient, getClientId } from "@/lib/auth-helpers"
import { redirect, notFound } from "next/navigation"
import { PayNowButton } from "@/components/pay-now-button"

export default async function InvoiceDetailPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> }) {
  const session = await requireAuth()
  const admin = isAdmin(session.user.role)
  const tutor = isTutor(session.user.role)
  const client = isClient(session.user.role)

  if (tutor) redirect("/dashboard")

  const { id } = await props.params
  const { paid } = await props.searchParams

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: { include: { user: { select: { name: true, email: true, city: { select: { name: true } } } } } },
      project: { select: { name: true } },
      items: {
        include: { hourLog: { select: { date: true, description: true, hours: true, tutor: { select: { user: { select: { name: true } } } }, project: { select: { name: true } } } } },
      },
    },
  })

  if (!invoice) notFound()

  if (client) {
    const clientId = await getClientId(session.user.id, session.user.email)
    if (!clientId || invoice.clientId !== clientId) notFound()
  }

  const settings = await prisma.companySettings.findUnique({ where: { id: "main" } })

  return (
    <div>
      {paid === "1" && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-green-800 dark:text-green-300">Payment successful! A receipt has been sent to your email.</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Invoice {invoice.number}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {invoice.client.user.name} &middot; {invoice.client.user.email}
            {invoice.client.user.city?.name && <span> &middot; {invoice.client.user.city.name}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href={`/api/invoices/${invoice.id}/pdf`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Download</a>
          {client && invoice.status !== "PAID" && <PayNowButton invoiceId={invoice.id} />}
          <span
            className={`inline-flex text-sm font-medium rounded-full px-3 py-1 ${
              invoice.status === "PAID"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : invoice.status === "SENT"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : invoice.status === "DRAFT"
                ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {invoice.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          {settings && (
            <div className="mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-700">
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{settings.name}</h4>
              <div className="text-xs text-zinc-500 space-y-0.5 mt-1">
                {settings.address && <p>{settings.address}</p>}
                {settings.email && <p>{settings.email}</p>}
                {settings.phone && <p>{settings.phone}</p>}
                {settings.taxNumber && <p>Tax: {settings.taxNumber}</p>}
              </div>
            </div>
          )}

          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Line Items</h3>
          {invoice.items.length === 0 ? (
            <p className="text-sm text-zinc-500">No line items.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Description</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Tutor</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Date</th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Project</th>
                  <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Hours</th>
                  <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Rate</th>
                  <th className="text-right px-2 py-2 text-xs font-medium text-zinc-500">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="text-sm border-b border-zinc-100 dark:border-zinc-700/50">
                    <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">{item.description}</td>
                    <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">
                      {item.hourLog?.tutor?.user?.name ?? "-"}
                    </td>
                    <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">
                      {item.hourLog ? new Date(item.hourLog.date).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">
                      {item.hourLog?.project?.name ?? item.description}
                    </td>
                    <td className="px-2 py-2 text-right text-zinc-600 dark:text-zinc-400">{item.hours > 0 ? item.hours : "-"}</td>
                    <td className="px-2 py-2 text-right text-zinc-600 dark:text-zinc-400">{item.rate > 0 ? `$${item.rate.toFixed(2)}` : "-"}</td>
                    <td className="px-2 py-2 text-right text-zinc-900 dark:text-zinc-100 font-medium">${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {invoice.subtotal > 0 && (
                  <>
                    <tr className="text-sm">
                      <td colSpan={3} className="px-2 py-1 text-right text-zinc-500">Subtotal</td>
                      <td className="px-2 py-1 text-right text-zinc-700 dark:text-zinc-300">${invoice.subtotal.toFixed(2)}</td>
                    </tr>
                    {invoice.taxRate > 0 && (
                      <tr className="text-sm">
                        <td colSpan={3} className="px-2 py-1 text-right text-zinc-500">Tax ({invoice.taxRate}%)</td>
                        <td className="px-2 py-1 text-right text-zinc-700 dark:text-zinc-300">${invoice.taxAmount.toFixed(2)}</td>
                      </tr>
                    )}
                    {invoice.discountAmount > 0 && (
                      <tr className="text-sm text-red-600 dark:text-red-400">
                        <td colSpan={3} className="px-2 py-1 text-right">
                          Discount {invoice.discountCode && <span className="font-mono">({invoice.discountCode})</span>}
                        </td>
                        <td className="px-2 py-1 text-right">-${invoice.discountAmount.toFixed(2)}</td>
                      </tr>
                    )}
                    <tr className="text-sm font-bold border-t border-zinc-200 dark:border-zinc-700">
                      <td colSpan={3} className="px-2 py-3 text-right text-zinc-900 dark:text-zinc-100">Total</td>
                      <td className="px-2 py-3 text-right text-zinc-900 dark:text-zinc-100">${invoice.totalAmount.toFixed(2)}</td>
                    </tr>
                  </>
                )}
                {invoice.subtotal === 0 && (
                  <tr className="text-sm font-bold border-t border-zinc-200 dark:border-zinc-700">
                    <td colSpan={3} className="px-2 py-3 text-right text-zinc-900 dark:text-zinc-100">Total</td>
                    <td className="px-2 py-3 text-right text-zinc-900 dark:text-zinc-100">${invoice.totalAmount.toFixed(2)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          )}
          {settings?.invoiceNotes && (
            <p className="text-xs text-zinc-400 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">{settings.invoiceNotes}</p>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Invoice #</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{invoice.number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Project</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{invoice.project?.name || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Due Date</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">
                {new Date(invoice.dueDate).toLocaleDateString()}
              </dd>
            </div>
            {invoice.sentAt && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Sent</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">
                  {new Date(invoice.sentAt).toLocaleDateString()}
                </dd>
              </div>
            )}
            {invoice.paidAt && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Paid</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">
                  {new Date(invoice.paidAt).toLocaleDateString()}
                  {invoice.paymentGateway && <span className="text-xs text-zinc-400 ml-1">via {invoice.paymentGateway.replace("-", " ")}</span>}
                </dd>
              </div>
            )}
          </dl>
          {invoice.notes && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-xs text-zinc-500 mb-1">Notes</p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{invoice.notes}</p>
            </div>
          )}
          {invoice.receiptUrl && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-xs text-zinc-500 mb-1">Payment Receipt</p>
              <a href={invoice.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View / Download Stripe Receipt
              </a>
            </div>
          )}
          {admin && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <p className="text-xs text-zinc-500 mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {invoice.status === "DRAFT" && (
                  <form action={`/api/invoices/${invoice.id}`} method="POST">
                    <input type="hidden" name="_action" value="markSent" />
                    <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors">Mark Sent</button>
                  </form>
                )}
                {invoice.status === "SENT" && (
                  <>
                    <form action={`/api/invoices/${invoice.id}`} method="POST" className="flex items-end gap-2">
                      <input type="hidden" name="_action" value="markPaid" />
                      <select name="paymentGateway" className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="stripe">Stripe</option><option value="e-transfer">E-Transfer</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="other">Other</option>
                      </select>
                      <button type="submit" className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors">Mark Paid</button>
                    </form>
                    <form action={`/api/invoices/${invoice.id}`} method="POST">
                      <input type="hidden" name="_action" value="sendReminder" />
                      <button type="submit" className="rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors">Send Reminder</button>
                    </form>
                  </>
                )}
                {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
                  <form action={`/api/invoices/${invoice.id}`} method="POST">
                    <input type="hidden" name="_action" value="markOverdue" />
                    <button type="submit" className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors">Mark Overdue</button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
