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
  await prisma.contract.deleteMany()
  await prisma.tutor.deleteMany()
  await prisma.client.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.user.deleteMany()
  await prisma.billingRate.deleteMany()
  await prisma.payScale.deleteMany()
  await prisma.city.deleteMany()

  const montreal = await prisma.city.create({
    data: { name: "Montreal", slug: "montreal" },
  })

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

  await prisma.billingRate.create({ data: { gradeLevel: "STUDY_HALL", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 0 } })
  await prisma.billingRate.create({ data: { gradeLevel: "PROGRAM_SUPERVISOR", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 0 } })
  await prisma.billingRate.create({ data: { gradeLevel: "IN_PERSON_MGMT", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 0 } })
  await prisma.billingRate.create({ data: { gradeLevel: "ONLINE_MGMT", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 0 } })
  await prisma.billingRate.create({ data: { gradeLevel: "SUPERVISION", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 0 } })
  await prisma.billingRate.create({ data: { gradeLevel: "MARKETING", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 0 } })

  // Tutor pay scale: actual rates from the company
  const payScales = [
    // Year 1 — Online
    { tenure: "1ST_YEAR", gradeLevel: "ELEMENTARY", mode: "ONLINE", rate: 20 },
    { tenure: "1ST_YEAR", gradeLevel: "SEC1_2", mode: "ONLINE", rate: 21 },
    { tenure: "1ST_YEAR", gradeLevel: "SEC3", mode: "ONLINE", rate: 23 },
    { tenure: "1ST_YEAR", gradeLevel: "SEC4_5", mode: "ONLINE", rate: 25 },
    { tenure: "1ST_YEAR", gradeLevel: "CEGEP", mode: "ONLINE", rate: 35 },
    { tenure: "1ST_YEAR", gradeLevel: "UNI", mode: "ONLINE", rate: 40 },
    // Year 1 — In-Person
    { tenure: "1ST_YEAR", gradeLevel: "ELEMENTARY", mode: "IN_PERSON", rate: 22 },
    { tenure: "1ST_YEAR", gradeLevel: "SEC1_2", mode: "IN_PERSON", rate: 23 },
    { tenure: "1ST_YEAR", gradeLevel: "SEC3", mode: "IN_PERSON", rate: 25 },
    { tenure: "1ST_YEAR", gradeLevel: "SEC4_5", mode: "IN_PERSON", rate: 27 },
    { tenure: "1ST_YEAR", gradeLevel: "CEGEP", mode: "IN_PERSON", rate: 37 },
    { tenure: "1ST_YEAR", gradeLevel: "UNI", mode: "IN_PERSON", rate: 42 },
    // Year 2 — Online
    { tenure: "2ND_YEAR", gradeLevel: "ELEMENTARY", mode: "ONLINE", rate: 22 },
    { tenure: "2ND_YEAR", gradeLevel: "SEC1_2", mode: "ONLINE", rate: 24 },
    { tenure: "2ND_YEAR", gradeLevel: "SEC3", mode: "ONLINE", rate: 26 },
    { tenure: "2ND_YEAR", gradeLevel: "SEC4_5", mode: "ONLINE", rate: 28 },
    { tenure: "2ND_YEAR", gradeLevel: "CEGEP", mode: "ONLINE", rate: 37 },
    { tenure: "2ND_YEAR", gradeLevel: "UNI", mode: "ONLINE", rate: 45 },
    // Year 2 — In-Person
    { tenure: "2ND_YEAR", gradeLevel: "ELEMENTARY", mode: "IN_PERSON", rate: 24 },
    { tenure: "2ND_YEAR", gradeLevel: "SEC1_2", mode: "IN_PERSON", rate: 25 },
    { tenure: "2ND_YEAR", gradeLevel: "SEC3", mode: "IN_PERSON", rate: 27 },
    { tenure: "2ND_YEAR", gradeLevel: "SEC4_5", mode: "IN_PERSON", rate: 29 },
    { tenure: "2ND_YEAR", gradeLevel: "CEGEP", mode: "IN_PERSON", rate: 40 },
    { tenure: "2ND_YEAR", gradeLevel: "UNI", mode: "IN_PERSON", rate: 47 },
    // Year 3 — Online
    { tenure: "3RD_YEAR", gradeLevel: "ELEMENTARY", mode: "ONLINE", rate: 24 },
    { tenure: "3RD_YEAR", gradeLevel: "SEC1_2", mode: "ONLINE", rate: 26 },
    { tenure: "3RD_YEAR", gradeLevel: "SEC3", mode: "ONLINE", rate: 28 },
    { tenure: "3RD_YEAR", gradeLevel: "SEC4_5", mode: "ONLINE", rate: 30 },
    { tenure: "3RD_YEAR", gradeLevel: "CEGEP", mode: "ONLINE", rate: 39 },
    { tenure: "3RD_YEAR", gradeLevel: "UNI", mode: "ONLINE", rate: 50 },
    // Year 3 — In-Person
    { tenure: "3RD_YEAR", gradeLevel: "ELEMENTARY", mode: "IN_PERSON", rate: 26 },
    { tenure: "3RD_YEAR", gradeLevel: "SEC1_2", mode: "IN_PERSON", rate: 27 },
    { tenure: "3RD_YEAR", gradeLevel: "SEC3", mode: "IN_PERSON", rate: 29 },
    { tenure: "3RD_YEAR", gradeLevel: "SEC4_5", mode: "IN_PERSON", rate: 31 },
    { tenure: "3RD_YEAR", gradeLevel: "CEGEP", mode: "IN_PERSON", rate: 43 },
    { tenure: "3RD_YEAR", gradeLevel: "UNI", mode: "IN_PERSON", rate: 52 },
    // Study Hall rates
    { tenure: "1ST_YEAR", gradeLevel: "STUDY_HALL", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 30 },
    { tenure: "2ND_YEAR", gradeLevel: "STUDY_HALL", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 32 },
    { tenure: "3RD_YEAR", gradeLevel: "STUDY_HALL", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 35 },
    // Program Supervisor rates
    { tenure: "1ST_YEAR", gradeLevel: "PROGRAM_SUPERVISOR", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 40 },
    { tenure: "2ND_YEAR", gradeLevel: "PROGRAM_SUPERVISOR", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 45 },
    { tenure: "3RD_YEAR", gradeLevel: "PROGRAM_SUPERVISOR", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 50 },
    // Supervisor category rates
    { tenure: "1ST_YEAR", gradeLevel: "IN_PERSON_MGMT", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 35 },
    { tenure: "2ND_YEAR", gradeLevel: "IN_PERSON_MGMT", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 38 },
    { tenure: "3RD_YEAR", gradeLevel: "IN_PERSON_MGMT", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 42 },
    { tenure: "1ST_YEAR", gradeLevel: "ONLINE_MGMT", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 30 },
    { tenure: "2ND_YEAR", gradeLevel: "ONLINE_MGMT", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 33 },
    { tenure: "3RD_YEAR", gradeLevel: "ONLINE_MGMT", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 36 },
    { tenure: "1ST_YEAR", gradeLevel: "SUPERVISION", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 40 },
    { tenure: "2ND_YEAR", gradeLevel: "SUPERVISION", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 45 },
    { tenure: "3RD_YEAR", gradeLevel: "SUPERVISION", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 50 },
    { tenure: "1ST_YEAR", gradeLevel: "MARKETING", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 25 },
    { tenure: "2ND_YEAR", gradeLevel: "MARKETING", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 28 },
    { tenure: "3RD_YEAR", gradeLevel: "MARKETING", mode: "IN_PERSON", projectType: "STUDY_HALL", rate: 32 },
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
      cityId: montreal.id,
    },
  })

  // Tutor 1 — 3rd year, experienced
  const t1User = await prisma.user.create({
    data: { name: "Sarah Chen", email: "sarah@tutoring.com", password: hash, role: "TUTOR", cityId: montreal.id },
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
    data: { name: "David Nguyen", email: "david@tutoring.com", password: hash, role: "TUTOR", cityId: montreal.id },
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
    data: { name: "Emma Tremblay", email: "emma@tutoring.com", password: hash, role: "TUTOR", cityId: montreal.id },
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

  // Tutor 4 — Program Supervisor
  const t4User = await prisma.user.create({
    data: { name: "Pierre Lavoie", email: "pierre@tutoring.com", password: hash, role: "TUTOR", cityId: montreal.id },
  })
  const tutor4 = await prisma.tutor.create({
    data: {
      userId: t4User.id,
      bio: "Program supervisor for study hall programs. Oversees group tutoring sessions and manages school partnerships.",
      subjects: "Math, Science, Study Skills",
      tenure: "3RD_YEAR",
      isActive: true,
      onboarded: true,
      onboardedAt: new Date("2024-01-15"),
    },
  })

  // Tutor 5 — Study Hall assistant
  const t5User = await prisma.user.create({
    data: { name: "Leila Haddad", email: "leila@tutoring.com", password: hash, role: "TUTOR", cityId: montreal.id },
  })
  const tutor5 = await prisma.tutor.create({
    data: {
      userId: t5User.id,
      bio: "Study hall tutor. Supports group sessions and homework help.",
      subjects: "English, French, Homework Buddy",
      tenure: "1ST_YEAR",
      isActive: true,
      onboarded: true,
      onboardedAt: new Date("2025-11-01"),
    },
  })

  // Contracts for onboarded tutors
  await prisma.contract.create({
    data: {
      tutorId: tutor1.id,
      type: "PRIVATE_TUTORING",
      yearLevel: "3RD_YEAR",
      terms: "Private tutoring contract. Tutor agrees to provide one-on-one tutoring sessions as assigned. Payment processed bi-weekly based on submitted and approved hours. All tutoring materials provided by the company.",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-07-01"),
      signed: true,
      signedAt: new Date("2025-08-25"),
    },
  })

  await prisma.contract.create({
    data: {
      tutorId: tutor2.id,
      type: "PRIVATE_TUTORING",
      yearLevel: "2ND_YEAR",
      terms: "Private tutoring contract. Tutor agrees to provide one-on-one tutoring sessions as assigned. Payment processed bi-weekly based on submitted and approved hours.",
      startDate: new Date("2025-10-01"),
      endDate: new Date("2026-07-01"),
      signed: true,
      signedAt: new Date("2025-09-28"),
    },
  })

  await prisma.contract.create({
    data: {
      tutorId: tutor4.id,
      type: "PROGRAM_SUPERVISOR",
      yearLevel: "3RD_YEAR",
      terms: "Program supervisor contract. Oversees study hall programs at partner schools. Responsible for tutor scheduling, program quality, and school liaison.",
      startDate: new Date("2025-08-01"),
      endDate: new Date("2026-07-01"),
      signed: true,
      signedAt: new Date("2025-07-20"),
    },
  })

  await prisma.contract.create({
    data: {
      tutorId: tutor5.id,
      type: "PRIVATE_TUTORING",
      yearLevel: "1ST_YEAR",
      terms: "Study hall tutor contract. Provides group tutoring and homework support during study hall sessions.",
      startDate: new Date("2025-11-15"),
      endDate: new Date("2026-07-01"),
      signed: true,
      signedAt: new Date("2025-11-10"),
    },
  })

  // Clients
  const c1User = await prisma.user.create({
    data: { name: "Robert Dupont", email: "robert@email.com", password: hash, role: "CLIENT", cityId: montreal.id },
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
    data: { name: "Marie Lambert", email: "marie@email.com", password: hash, role: "CLIENT", cityId: montreal.id },
  })
  const client2 = await prisma.client.create({
    data: {
      userId: c2User.id,
      phone: "514-555-0202",
      notes: "Daughter in Sec 5, needs math help for ministry exam.",
    },
  })

  const c3User = await prisma.user.create({
    data: { name: "Jean-Paul Tremblay", email: "jp@email.com", password: hash, role: "CLIENT", cityId: montreal.id },
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
      subjects: "Math, Study Skills",
      school: "École Secondaire St-Luc",
      gradeLevel: "SEC3",
      projectType: "STUDENT",
      clientId: client1.id,
      cityId: montreal.id,
    },
  })
  await prisma.projectTutor.create({ data: { projectId: p1.id, tutorId: tutor1.id } })

  const p2 = await prisma.project.create({
    data: {
      name: "Chloe Dupont — Science",
      description: "Elementary science enrichment",
      subjects: "Science, Reading",
      school: "École Primaire Soleil",
      gradeLevel: "ELEMENTARY",
      projectType: "STUDENT",
      clientId: client1.id,
      cityId: montreal.id,
    },
  })
  await prisma.projectTutor.create({ data: { projectId: p2.id, tutorId: tutor1.id } })

  const p3 = await prisma.project.create({
    data: {
      name: "Camille Lambert — Math",
      description: "Sec 5 math, ministry exam prep",
      subjects: "Math, Executive Functioning",
      school: "Collège Jean-de-Brébeuf",
      gradeLevel: "SEC4_5",
      projectType: "STUDENT",
      clientId: client2.id,
      cityId: montreal.id,
    },
  })
  await prisma.projectTutor.create({ data: { projectId: p3.id, tutorId: tutor2.id } })

  const p4 = await prisma.project.create({
    data: {
      name: "Alexandre Tremblay — Physics",
      description: "CEGEP physics, mechanics",
      subjects: "Physics, Mechanics",
      school: "Dawson College",
      gradeLevel: "CEGEP",
      projectType: "STUDENT",
      clientId: client3.id,
      cityId: montreal.id,
    },
  })
  await prisma.projectTutor.create({ data: { projectId: p4.id, tutorId: tutor1.id } })

  const p5 = await prisma.project.create({
    data: {
      name: "Sophie Lambert — English",
      description: "Sec 1 English tutoring",
      subjects: "English, Writing",
      school: "Royal West Academy",
      gradeLevel: "SEC1_2",
      projectType: "STUDENT",
      clientId: client2.id,
      cityId: montreal.id,
    },
  })
  await prisma.projectTutor.create({ data: { projectId: p5.id, tutorId: tutor2.id } })

  const p6 = await prisma.project.create({
    data: {
      name: "Marc Tremblay — Chemistry",
      description: "UNI chemistry, first year",
      subjects: "Chemistry, Chemistry 1",
      school: "McGill University",
      gradeLevel: "UNI",
      projectType: "STUDENT",
      clientId: client3.id,
      cityId: montreal.id,
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
      paidAt: new Date("2026-05-28"),
    },
  })

  // Mark one more as paid
  await prisma.hourLog.create({
    data: {
      tutorId: tutor1.id,
      projectId: p1.id,
      date: new Date("2026-05-28"),
      hours: 1,
      mode: "IN_PERSON",
      billingRate: billingRate.rate,
      tutorPayRate: payScale3rdInPerson.rate,
      description: "Algebra review",
      paidAt: new Date("2026-05-29"),
    },
  })

  // Second city: Toronto
  const toronto = await prisma.city.create({
    data: { name: "Toronto", slug: "toronto" },
  })

  const torontoAdmin = await prisma.user.create({
    data: { name: "Toronto Admin", email: "admin@toronto.jasstutors.com", password: hash, role: "CITY_ADMIN", cityId: toronto.id },
  })

  const tt1User = await prisma.user.create({
    data: { name: "James Wilson", email: "james@toronto.jasstutors.com", password: hash, role: "TUTOR", cityId: toronto.id },
  })
  const torontoTutor = await prisma.tutor.create({
    data: {
      userId: tt1User.id,
      bio: "Math and science tutor based in Toronto. 2 years experience.",
      subjects: "Math, Science",
      tenure: "2ND_YEAR",
      isActive: true,
      onboarded: true,
      onboardedAt: new Date("2025-06-01"),
    },
  })

  await prisma.contract.create({
    data: {
      tutorId: torontoTutor.id,
      type: "PRIVATE_TUTORING",
      yearLevel: "2ND_YEAR",
      terms: "Toronto private tutoring contract.",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-07-01"),
      signed: true,
      signedAt: new Date("2025-08-20"),
    },
  })

  const tc1User = await prisma.user.create({
    data: { name: "Alice Brown", email: "alice@toronto.email.com", password: hash, role: "CLIENT", cityId: toronto.id },
  })
  const torontoClient = await prisma.client.create({
    data: { userId: tc1User.id, phone: "416-555-0101", notes: "Grade 9 math tutoring." },
  })

  const tp1 = await prisma.project.create({
    data: {
      name: "Emily Brown — Math",
      subjects: "Math",
      gradeLevel: "SEC3",
      projectType: "STUDENT",
      clientId: torontoClient.id,
      cityId: toronto.id,
    },
  })
  await prisma.projectTutor.create({ data: { projectId: tp1.id, tutorId: torontoTutor.id } })

  // Study Hall projects
  const sh1 = await prisma.project.create({
    data: {
      name: "Royal West Academy — Study Hall",
      description: "After-school study hall program, grades 9-11",
      subjects: "Math, Science, English",
      projectType: "STUDY_HALL",
      school: "Royal West Academy",
      gradeLevel: "STUDY_HALL",
      cityId: montreal.id,
    },
  })
  await prisma.projectTutor.create({ data: { projectId: sh1.id, tutorId: tutor4.id } })
  await prisma.projectTutor.create({ data: { projectId: sh1.id, tutorId: tutor5.id } })

  const sh2 = await prisma.project.create({
    data: {
      name: "Northern Secondary — Study Hall",
      description: "Lunch-time study hall",
      subjects: "All subjects",
      projectType: "STUDY_HALL",
      school: "Northern Secondary School",
      gradeLevel: "STUDY_HALL",
      cityId: toronto.id,
    },
  })

  const sh3 = await prisma.project.create({
    data: {
      name: "Montreal Program Supervisors",
      description: "Program supervisor team",
      subjects: "All subjects",
      projectType: "STUDY_HALL",
      gradeLevel: "PROGRAM_SUPERVISOR",
      cityId: montreal.id,
    },
  })

  console.log("Seed complete!")
  console.log("Montreal: 1 admin, 5 tutors, 3 clients, 6 projects, 5 hour logs, 2 contracts")
  console.log("Toronto: 1 city admin, 1 tutor, 1 client, 2 projects")
  console.log("All passwords: password123")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
