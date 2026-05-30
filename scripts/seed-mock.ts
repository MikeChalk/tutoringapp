import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const p = new PrismaClient()

async function main() {
  const montreal = await p.city.findFirst({ where: { slug: "montreal" } })
  if (!montreal) { console.log("Montreal city not found — run main seed first"); return }
  const montrealId = montreal.id

  const rwaProject = await p.project.findFirst({
    where: { name: "Royal West Academy — Study Hall", cityId: montrealId },
  })
  if (!rwaProject) { console.log("RWA study hall project not found — run main seed first"); return }
  const rwaProjectId = rwaProject.id

  console.log("=== Creating mock school client ===")
  const pw = await bcrypt.hash("school123", 12)
  const schoolUser = await p.user.create({
    data: {
      name: "Royal West Academy",
      email: "admin@royalwest.qc.ca",
      password: pw,
      role: "CLIENT",
      cityId: montrealId,
    },
  })
  const schoolClient = await p.client.create({
    data: {
      userId: schoolUser.id,
      type: "SCHOOL",
      company: "Royal West Academy",
      phone: "514-555-0100",
      address: "189 Easton Ave, Montreal, QC",
    },
  })
  console.log(`  Created school: ${schoolClient.id}`)

  console.log("\n=== Linking study hall project to school ===")
  await p.project.update({
    where: { id: rwaProjectId },
    data: { clientId: schoolClient.id },
  })
  console.log(`  Linked ${rwaProjectId} to school`)

  console.log("\n=== Assigning Pierre (supervisor) to study hall project ===")
  const pierreTutor = await p.tutor.findFirst({
    where: { user: { email: "pierre@tutoring.com" } },
    select: { id: true },
  })
  if (pierreTutor) {
    await p.projectTutor.create({
      data: { projectId: rwaProjectId, tutorId: pierreTutor.id },
    })
    console.log(`  Pierre assigned to ${rwaProjectId}`)
  } else {
    console.log(`  Pierre not found — skipping`)
  }

  console.log("\n=== Creating study hall invoice ===")
  const due = new Date()
  due.setDate(due.getDate() + 30)
  const shInvoice = await p.invoice.create({
    data: {
      number: "INV-1001",
      clientId: schoolClient.id,
      status: "SENT",
      dueDate: due,
      totalAmount: 2400.00,
      notes: "Study Hall monitoring — May 2026 (flat monthly fee, 12 sessions)",
      items: {
        create: [
          {
            description: "Study Hall Supervision — May 2026 (12 sessions x 3hrs)",
            hours: 36,
            rate: 40.00,
            amount: 1440.00,
          },
          {
            description: "Study Hall Materials & Resources Fee",
            hours: 0,
            rate: 0,
            amount: 480.00,
          },
          {
            description: "Study Hall Coordination Fee (monthly)",
            hours: 0,
            rate: 0,
            amount: 480.00,
          },
        ],
      },
    },
    include: { items: true },
  })
  console.log(`  Created ${shInvoice.number}: $${shInvoice.totalAmount} (${shInvoice.status})`)

  const robertClient = await p.client.findFirst({
    where: { user: { email: "robert@email.com" } },
    select: { id: true },
  })
  if (robertClient) {
    console.log("\n=== Creating hourly invoice for Robert Dupont ===")
    const logs1 = await p.hourLog.findMany({
      where: { project: { clientId: robertClient.id }, invoiceItems: { none: {} } },
      orderBy: { date: "asc" },
    })
    if (logs1.length > 0) {
      const total = logs1.reduce((s, l) => s + l.hours * l.billingRate, 0)
      const inv1 = await p.invoice.create({
        data: {
          number: "INV-1002",
          clientId: robertClient.id,
          status: "SENT",
          dueDate: due,
          totalAmount: total,
          notes: "Private tutoring for Lucas Dupont",
          items: {
            create: logs1.map(l => ({
              description: l.description || `Tutoring on ${new Date(l.date).toLocaleDateString()} (${l.mode === "ONLINE" ? "Online" : "In Person"})`,
              hours: l.hours,
              rate: l.billingRate,
              amount: l.hours * l.billingRate,
              hourLogId: l.id,
            })),
          },
        },
      })
      console.log(`  Created ${inv1.number}: $${inv1.totalAmount.toFixed(2)} (${inv1.status}) — ${logs1.length} logs`)
    }
  }

  const marieClient = await p.client.findFirst({
    where: { user: { email: "marie@email.com" } },
    select: { id: true },
  })
  if (marieClient) {
    console.log("\n=== Creating hourly invoice for Marie Lambert ===")
    const logs2 = await p.hourLog.findMany({
      where: { project: { clientId: marieClient.id }, invoiceItems: { none: {} } },
      orderBy: { date: "asc" },
    })
    if (logs2.length > 0) {
      const total = logs2.reduce((s, l) => s + l.hours * l.billingRate, 0)
      const inv2 = await p.invoice.create({
        data: {
          number: "INV-1003",
          clientId: marieClient.id,
          status: "DRAFT",
          dueDate: due,
          totalAmount: total,
          notes: "Private tutoring for Camille Lambert",
          items: {
            create: logs2.map(l => ({
              description: l.description || `Tutoring on ${new Date(l.date).toLocaleDateString()} (${l.mode === "ONLINE" ? "Online" : "In Person"})`,
              hours: l.hours,
              rate: l.billingRate,
              amount: l.hours * l.billingRate,
              hourLogId: l.id,
            })),
          },
        },
      })
      console.log(`  Created ${inv2.number}: $${inv2.totalAmount.toFixed(2)} (${inv2.status}) — ${logs2.length} logs`)
    }
  }

  console.log("\n=== Done ===")
  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
