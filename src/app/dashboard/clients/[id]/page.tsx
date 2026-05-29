import { prisma } from "@/lib/db"
import { requireAuth, isAdmin, isTutor, getTutorId } from "@/lib/auth-helpers"
import { notFound } from "next/navigation"
import Link from "next/link"

const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ON_HOLD: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  FINISHED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

export default async function ClientDetailPage(props: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  const admin = isAdmin(session.user.role)
  const tutor = isTutor(session.user.role)

  const { id } = await props.params

  let hasAccess = true
  if (tutor) {
    const tutorId = await getTutorId(session.user.id)
    if (!tutorId) {
      hasAccess = false
    } else {
      const projectCount = await prisma.project.count({
        where: { clientId: id, projectTutors: { some: { tutorId } } },
      })
      hasAccess = projectCount > 0
    }
  }

  if (!hasAccess) notFound()

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      projects: {
        include: {
          projectTutors: {
            include: { tutor: { include: { user: { select: { name: true } } } } },
          },
        },
      },
      invoices: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!client) notFound()

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{client.user.name}</h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">{client.user.email}</p>
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-6">Client since {new Date(client.createdAt).toLocaleDateString()}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Company</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{client.company || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Phone</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{client.phone || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Address</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{client.address || "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Projects</h3>
          {client.projects.length === 0 ? (
            <p className="text-sm text-zinc-500">No projects yet.</p>
          ) : (
            <ul className="space-y-3">
              {client.projects.map((project) => (
                <li key={project.id} className="text-sm">
                  <Link
                    href={`/dashboard/projects/${project.id}`}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {project.name}
                  </Link>
                  <span className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ml-2 ${STATUS_COLORS[project.status] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"}`}>
                    {project.status}
                  </span>
                  <p className="text-xs text-zinc-500 mt-1">
                    Started: {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Tutors:{" "}
                    {project.projectTutors
                      .map((pt) => pt.tutor.user.name)
                      .join(", ") || "None assigned"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Invoices</h3>
          {admin && (
            <Link
              href={`/dashboard/invoices/new?clientId=${client.id}`}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Create Invoice
            </Link>
          )}
        </div>
        {client.invoices.length === 0 ? (
          <p className="text-sm text-zinc-500">No invoices yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Number</th>
                <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Amount</th>
                <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Status</th>
                <th className="text-left px-2 py-2 text-xs font-medium text-zinc-500">Due</th>
              </tr>
            </thead>
            <tbody>
              {client.invoices.map((invoice) => (
                <tr key={invoice.id} className="text-sm">
                  <td className="px-2 py-2">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-zinc-900 dark:text-zinc-100">
                    ${invoice.totalAmount.toFixed(2)}
                  </td>
                  <td className="px-2 py-2">{invoiceStatusBadge(invoice.status)}</td>
                  <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function invoiceStatusBadge(status: string) {
  const colors: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400",
    SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  }
  return (
    <span className={`inline-flex text-xs font-medium rounded-full px-2 py-0.5 ${colors[status] || ""}`}>
      {status}
    </span>
  )
}
