import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.hourLog.deleteMany()
  await prisma.projectTutor.deleteMany()
  await prisma.project.deleteMany()
  await prisma.tutoringRequest.deleteMany()
  await prisma.tutor.deleteMany()
  await prisma.client.deleteMany()
  await prisma.user.deleteMany()
  await prisma.billingRate.deleteMany()
  await prisma.payScale.deleteMany()

  // Billing rates: what the client pays (from jasstutors.com)
  const billingRates = [
    { gradeLevel: "ELEMENTARY", mode: "ONLINE", rate: 27 },
    { gradeLevel: "ELEMENTARY", mode: "IN_PERSON", rate: 29 },
    { gradeLevel: "SEC1_2", mode: "ONLINE", rate: 30 },
    { gradeLevel: "SEC1_2", mode: "IN_PERSON", rate: 32 },
    { gradeLevel: "SEC3", mode: "ONLINE", rate: 32 },
    { gradeLevel: "SEC3", mode: "IN_PERSON", rate: 34 },
    { gradeLevel: "SEC4_5", mode: "ONLINE", rate: 34 },
    { gradeLevel: "SEC4_5", mode: "IN_PERSON", rate: 36 },
    { gradeLevel: "CEGEP", mode: "ONLINE", rate: 45 },
    { gradeLevel: "CEGEP", mode: "IN_PERSON", rate: 50 },
    { gradeLevel: "UNI", mode: "ONLINE", rate: 55 },
    { gradeLevel: "UNI", mode: "IN_PERSON", rate: 60 },
  ]

  for (const rate of billingRates) {
    await prisma.billingRate.create({ data: rate })
  }

  // Tutor pay scale: what the tutor earns based on tenure, grade, mode
  // 1st year ≈56% of bill rate, 2nd year ≈63%, 3rd year ≈70%
  const payScales = [
    // 1st Year
    { tenure: "1ST_YEAR", gradeLevel: "ELEMENTARY", mode: "ONLINE", rate: 15 },
    { tenure: "1ST_YEAR", gradeLevel: "ELEMENTARY", mode: "IN_PERSON", rate: 16 },
    { tenure: "1ST_YEAR", gradeLevel: "SEC1_2", mode: "ONLINE", rate: 17 },
    { tenure: "1ST_YEAR", gradeLevel: "SEC1_2", mode: "IN_PERSON", rate: 18 },
    { tenure: "1ST_YEAR", gradeLevel: "SEC3", mode: "ONLINE", rate: 18 },
    { tenure: "1ST_YEAR", gradeLevel: "SEC3", mode: "IN_PERSON", rate: 19 },
    { tenure: "1ST_YEAR", gradeLevel: "SEC4_5", mode: "ONLINE", rate: 19 },
    { tenure: "1ST_YEAR", gradeLevel: "SEC4_5", mode: "IN_PERSON", rate: 20 },
    { tenure: "1ST_YEAR", gradeLevel: "CEGEP", mode: "ONLINE", rate: 25 },
    { tenure: "1ST_YEAR", gradeLevel: "CEGEP", mode: "IN_PERSON", rate: 28 },
    { tenure: "1ST_YEAR", gradeLevel: "UNI", mode: "ONLINE", rate: 31 },
    { tenure: "1ST_YEAR", gradeLevel: "UNI", mode: "IN_PERSON", rate: 34 },
    // 2nd Year
    { tenure: "2ND_YEAR", gradeLevel: "ELEMENTARY", mode: "ONLINE", rate: 17 },
    { tenure: "2ND_YEAR", gradeLevel: "ELEMENTARY", mode: "IN_PERSON", rate: 18 },
    { tenure: "2ND_YEAR", gradeLevel: "SEC1_2", mode: "ONLINE", rate: 19 },
    { tenure: "2ND_YEAR", gradeLevel: "SEC1_2", mode: "IN_PERSON", rate: 20 },
    { tenure: "2ND_YEAR", gradeLevel: "SEC3", mode: "ONLINE", rate: 20 },
    { tenure: "2ND_YEAR", gradeLevel: "SEC3", mode: "IN_PERSON", rate: 21 },
    { tenure: "2ND_YEAR", gradeLevel: "SEC4_5", mode: "ONLINE", rate: 21 },
    { tenure: "2ND_YEAR", gradeLevel: "SEC4_5", mode: "IN_PERSON", rate: 23 },
    { tenure: "2ND_YEAR", gradeLevel: "CEGEP", mode: "ONLINE", rate: 28 },
    { tenure: "2ND_YEAR", gradeLevel: "CEGEP", mode: "IN_PERSON", rate: 31 },
    { tenure: "2ND_YEAR", gradeLevel: "UNI", mode: "ONLINE", rate: 35 },
    { tenure: "2ND_YEAR", gradeLevel: "UNI", mode: "IN_PERSON", rate: 38 },
    // 3rd Year
    { tenure: "3RD_YEAR", gradeLevel: "ELEMENTARY", mode: "ONLINE", rate: 19 },
    { tenure: "3RD_YEAR", gradeLevel: "ELEMENTARY", mode: "IN_PERSON", rate: 20 },
    { tenure: "3RD_YEAR", gradeLevel: "SEC1_2", mode: "ONLINE", rate: 21 },
    { tenure: "3RD_YEAR", gradeLevel: "SEC1_2", mode: "IN_PERSON", rate: 22 },
    { tenure: "3RD_YEAR", gradeLevel: "SEC3", mode: "ONLINE", rate: 22 },
    { tenure: "3RD_YEAR", gradeLevel: "SEC3", mode: "IN_PERSON", rate: 24 },
    { tenure: "3RD_YEAR", gradeLevel: "SEC4_5", mode: "ONLINE", rate: 24 },
    { tenure: "3RD_YEAR", gradeLevel: "SEC4_5", mode: "IN_PERSON", rate: 25 },
    { tenure: "3RD_YEAR", gradeLevel: "CEGEP", mode: "ONLINE", rate: 31 },
    { tenure: "3RD_YEAR", gradeLevel: "CEGEP", mode: "IN_PERSON", rate: 35 },
    { tenure: "3RD_YEAR", gradeLevel: "UNI", mode: "ONLINE", rate: 38 },
    { tenure: "3RD_YEAR", gradeLevel: "UNI", mode: "IN_PERSON", rate: 42 },
  ]

  for (const scale of payScales) {
    await prisma.payScale.create({ data: scale })
  }

  const hash = await bcrypt.hash("password123", 12)

  // Admin user
  const admin = await prisma.user.create({
    data: {
      name: "Michael Chalk",
      email: "admin@tutoring.com",
      password: hash,
      role: "ADMIN",
    },
  })

  // Tutor 1 — 3rd year, experienced
  const t1User = await prisma.user.create({
    data: { name: "Sarah Chen", email: "sarah@tutoring.com", password: hash, role: "TUTOR" },
  })
  const tutor1 = await prisma.tutor.create({
    data: {
      userId: t1User.id,
      bio: "Math and physics specialist with 3 years of experience. McGill graduate.",
      subjects: "Mathematics, Physics",
      tenure: "3RD_YEAR",
      isActive: true,
      onboarded: true,
      onboardedAt: new Date("2023-09-01"),
    },
  })

  // Tutor 2 — 2nd year
  const t2User = await prisma.user.create({
    data: { name: "David Nguyen", email: "david@tutoring.com", password: hash, role: "TUTOR" },
  })
  const tutor2 = await prisma.tutor.create({
    data: {
      userId: t2User.id,
      bio: "English and French literature tutor. CEGEP instructor.",
      subjects: "English, French",
      tenure: "2ND_YEAR",
      isActive: true,
      onboarded: true,
      onboardedAt: new Date("2024-06-15"),
    },
  })

  // Tutor 3 — 1st year, still onboarding
  const t3User = await prisma.user.create({
    data: { name: "Emma Tremblay", email: "emma@tutoring.com", password: hash, role: "TUTOR" },
  })
  const tutor3 = await prisma.tutor.create({
    data: {
      userId: t3User.id,
      bio: "Science and chemistry tutor. Currently studying at UdeM.",
      subjects: "Chemistry, Science",
      tenure: "1ST_YEAR",
      isActive: true,
      onboarded: false,
    },
  })

  // Clients
  const c1User = await prisma.user.create({
    data: { name: "Robert Dupont", email: "robert@email.com", password: hash, role: "CLIENT" },
  })
  const client1 = await prisma.client.create({
    data: {
      userId: c1User.id,
      phone: "514-555-0101",
      address: "123 Rue Sherbrooke, Montreal",
      notes: "Two children in tutoring. Prefers evening sessions.",
    },
  })

  const c2User = await prisma.user.create({
    data: { name: "Marie Lambert", email: "marie@email.com", password: hash, role: "CLIENT" },
  })
  const client2 = await prisma.client.create({
    data: {
      userId: c2User.id,
      phone: "514-555-0202",
      notes: "Daughter in Sec 5, needs math help for ministry exam.",
    },
  })

  const c3User = await prisma.user.create({
    data: { name: "Jean-Paul Tremblay", email: "jp@email.com", password: hash, role: "CLIENT" },
  })
  const client3 = await prisma.client.create({
    data: {
      userId: c3User.id,
      company: "Tremblay Consulting",
      phone: "438-555-0303",
      address: "456 Rue St-Denis, Montreal",
      notes: "CEGEP student needing physics tutoring. Prefers online.",
    },
  })

  // Projects (students)
  const p1 = await prisma.project.create({
    data: {
      name: "Lucas Dupont — Math",
      description: "Sec 3 math tutoring",
      subject: "Mathematics",
      gradeLevel: "SEC3",
      clientId: client1.id,
    },
  })
  await prisma.projectTutor.create({ data: { projectId: p1.id, tutorId: tutor1.id } })

  const p2 = await prisma.project.create({
    data: {
      name: "Chloe Dupont — Science",
      description: "Elementary science enrichment",
      subject: "Science",
      gradeLevel: "ELEMENTARY",
      clientId: client1.id,
    },
  })
  await prisma.projectTutor.create({ data: { projectId: p2.id, tutorId: tutor1.id } })

  const p3 = await prisma.project.create({
    data: {
      name: "Camille Lambert — Math",
      description: "Sec 5 math, ministry exam prep",
      subject: "Mathematics",
      gradeLevel: "SEC4_5",
      clientId: client2.id,
    },
  })
  await prisma.projectTutor.create({ data: { projectId: p3.id, tutorId: tutor2.id } })

  const p4 = await prisma.project.create({
    data: {
      name: "Alexandre Tremblay — Physics",
      description: "CEGEP physics, mechanics",
      subject: "Physics",
      gradeLevel: "CEGEP",
      clientId: client3.id,
    },
  })
  await prisma.projectTutor.create({ data: { projectId: p4.id, tutorId: tutor1.id } })

  const p5 = await prisma.project.create({
    data: {
      name: "Sophie Lambert — English",
      description: "Sec 1 English tutoring",
      subject: "English",
      gradeLevel: "SEC1_2",
      clientId: client2.id,
    },
  })
  await prisma.projectTutor.create({ data: { projectId: p5.id, tutorId: tutor2.id } })

  const p6 = await prisma.project.create({
    data: {
      name: "Marc Tremblay — Chemistry",
      description: "UNI chemistry, first year",
      subject: "Chemistry",
      gradeLevel: "UNI",
      clientId: client3.id,
    },
  })
  await prisma.projectTutor.create({ data: { projectId: p6.id, tutorId: tutor3.id } })

  // Sample hour logs
  const billingRate = (await prisma.billingRate.findFirst({ where: { gradeLevel: "SEC3", mode: "IN_PERSON" } }))!
  const payScale3rdInPerson = (await prisma.payScale.findFirst({ where: { tenure: "3RD_YEAR", gradeLevel: "SEC3", mode: "IN_PERSON" } }))!

  await prisma.hourLog.create({
    data: {
      tutorId: tutor1.id,
      projectId: p1.id,
      date: new Date("2026-05-26"),
      hours: 2,
      mode: "IN_PERSON",
      billingRate: billingRate.rate,
      tutorPayRate: payScale3rdInPerson.rate,
      description: "Algebra: quadratic equations",
      status: "APPROVED",
    },
  })

  await prisma.hourLog.create({
    data: {
      tutorId: tutor1.id,
      projectId: p1.id,
      date: new Date("2026-05-27"),
      hours: 1.5,
      mode: "ONLINE",
      billingRate: (await prisma.billingRate.findFirst({ where: { gradeLevel: "SEC3", mode: "ONLINE" } }))!.rate,
      tutorPayRate: (await prisma.payScale.findFirst({ where: { tenure: "3RD_YEAR", gradeLevel: "SEC3", mode: "ONLINE" } }))!.rate,
      description: "Geometry review",
      status: "APPROVED",
    },
  })

  await prisma.hourLog.create({
    data: {
      tutorId: tutor2.id,
      projectId: p3.id,
      date: new Date("2026-05-25"),
      hours: 2,
      mode: "IN_PERSON",
      billingRate: (await prisma.billingRate.findFirst({ where: { gradeLevel: "SEC4_5", mode: "IN_PERSON" } }))!.rate,
      tutorPayRate: (await prisma.payScale.findFirst({ where: { tenure: "2ND_YEAR", gradeLevel: "SEC4_5", mode: "IN_PERSON" } }))!.rate,
      description: "Ministry exam practice: functions",
      status: "APPROVED",
    },
  })

  await prisma.hourLog.create({
    data: {
      tutorId: tutor1.id,
      projectId: p4.id,
      date: new Date("2026-05-24"),
      hours: 1.5,
      mode: "ONLINE",
      billingRate: (await prisma.billingRate.findFirst({ where: { gradeLevel: "CEGEP", mode: "ONLINE" } }))!.rate,
      tutorPayRate: (await prisma.payScale.findFirst({ where: { tenure: "3RD_YEAR", gradeLevel: "CEGEP", mode: "ONLINE" } }))!.rate,
      description: "Newton's laws, free-body diagrams",
      status: "PENDING",
    },
  })

  console.log("Seed complete!")
  console.log(`Created: admin, 3 tutors, 3 clients, 6 projects, 4 hour logs`)
  console.log("All passwords: password123")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
