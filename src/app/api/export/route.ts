import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/auth-helpers"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") || "hours"
  const city = searchParams.get("city")

  const headers: string[] = []
  const rows: string[][] = []

  if (type === "hours") {
    headers.push("Date", "Tutor", "Project", "Client", "Mode", "Hours", "Billing Rate", "Pay Rate", "Total Pay", "Category")
    const logs = await prisma.hourLog.findMany({
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
      include: { client: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    })
    for (const i of invoices) {
      rows.push([
        i.number,
        i.client.user.name,
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
  }

  const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=${type}-export.csv`,
    },
  })
}
