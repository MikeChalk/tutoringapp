import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityFilter } from "@/lib/auth-helpers"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const cityFilter = await getCityFilter(session.user.role, session.user.id)
  const tutorCityFilter = await getCityFilter(session.user.role, session.user.id)

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "hours"

  const headers: string[] = []
  const rows: string[][] = []

  if (type === "hours") {
    headers.push("Date", "Tutor", "Project", "Client", "Mode", "Hours", "Billing Rate", "Pay Rate", "Total Pay", "Category")
    const logs = await prisma.hourLog.findMany({
      where: { project: cityFilter },
      include: {
        tutor: { include: { user: { select: { name: true } } } },
        project: { include: { client: { include: { user: { select: { name: true } } } } } },
      },
      orderBy: { date: "desc" },
    })
    for (const l of logs) {
      rows.push([
        new Date(l.date).toISOString().split("T")[0],
        l.tutor.user.name,
        l.project.name,
        l.project.client?.user.name || "",
        l.mode,
        String(l.hours),
        String(l.billingRate),
        String(l.tutorPayRate),
        String(l.hours * l.tutorPayRate),
        l.category || "",
      ])
    }
  } else if (type === "invoices") {
    headers.push("Number", "Client", "Status", "Amount", "Due Date", "Paid Date", "Gateway")
    const invoices = await prisma.invoice.findMany({
      where: { client: { user: cityFilter } },
      include: { client: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    })
    for (const i of invoices) {
      rows.push([
        i.number,
        i.client?.user.name || "",
        i.status,
        String(i.totalAmount),
        new Date(i.dueDate).toISOString().split("T")[0],
        i.paidAt ? new Date(i.paidAt).toISOString().split("T")[0] : "",
        i.paymentGateway || "",
      ])
    }
  } else if (type === "tutors") {
    headers.push("Name", "Email", "Tenure", "Subjects", "Grades", "Status", "City")
    const tutors = await prisma.tutor.findMany({
      where: { user: tutorCityFilter },
      include: { user: { select: { name: true, email: true, city: { select: { name: true } } } } },
      orderBy: { user: { name: "asc" } },
    })
    for (const t of tutors) {
      rows.push([
        t.user.name,
        t.user.email,
        t.tenure,
        t.subjects,
        t.gradeLevels,
        t.onboarded ? "Active" : t.isActive ? "Waitlist" : "Inactive",
        t.user.city?.name || "",
      ])
    }
  } else if (type === "accounting") {
    // QuickBooks / Xero compatible general ledger export
    headers.push("Date", "Account", "Description", "Debit", "Credit", "Reference", "Client")
    
    const invoices = await prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PAID"] }, client: { user: cityFilter } },
      include: { client: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" },
    })
    for (const inv of invoices) {
      rows.push([
        new Date(inv.createdAt).toISOString().split("T")[0],
        "Accounts Receivable",
        `Invoice ${inv.number}`,
        inv.totalAmount.toFixed(2),
        "0.00",
        inv.number,
        inv.client?.user.name || "",
      ])
      rows.push([
        new Date(inv.createdAt).toISOString().split("T")[0],
        "Tutoring Revenue",
        `Invoice ${inv.number}`,
        "0.00",
        inv.totalAmount.toFixed(2),
        inv.number,
        inv.client?.user.name || "",
      ])
    }

    const paidInvoices = invoices.filter(i => i.status === "PAID")
    for (const inv of paidInvoices) {
      rows.push([
        inv.paidAt ? new Date(inv.paidAt).toISOString().split("T")[0] : new Date(inv.createdAt).toISOString().split("T")[0],
        "Cash",
        `Payment ${inv.number}`,
        inv.totalAmount.toFixed(2),
        "0.00",
        inv.number,
        inv.client?.user.name || "",
      ])
      rows.push([
        inv.paidAt ? new Date(inv.paidAt).toISOString().split("T")[0] : new Date(inv.createdAt).toISOString().split("T")[0],
        "Accounts Receivable",
        `Payment ${inv.number}`,
        "0.00",
        inv.totalAmount.toFixed(2),
        inv.number,
        inv.client?.user.name || "",
      ])
    }

    const expenses = await prisma.expense.findMany({
      where: cityFilter,
      include: { client: { include: { user: { select: { name: true } } } } },
      orderBy: { date: "asc" },
    })
    for (const e of expenses) {
      const accountName = e.category === "TUTOR_PAY" ? "Tutor Pay Expense" : "Operating Expenses"
      rows.push([
        new Date(e.date).toISOString().split("T")[0],
        accountName,
        e.description,
        e.amount.toFixed(2),
        "0.00",
        e.id.slice(0, 8),
        e.client?.user.name || "",
      ])
      rows.push([
        new Date(e.date).toISOString().split("T")[0],
        "Cash",
        e.description,
        "0.00",
        e.amount.toFixed(2),
        e.id.slice(0, 8),
        e.client?.user.name || "",
      ])
    }
  }

  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""').replace(/^[=@+\-]+/, "'$&")}"`).join(","))].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=${type}-export.csv`,
    },
  })
}
