import { PrismaClient } from "@prisma/client"

const p = new PrismaClient()

async function main() {
  await p.contractTemplate.deleteMany()

  await p.contractTemplate.createMany({
    data: [
      {
        name: "Private Tutoring — Year 1",
        type: "PRIVATE_TUTORING",
        yearLevel: "1ST_YEAR",
        isDefault: true,
        rates: JSON.stringify({ ELEMENTARY: 22, SEC1_2: 25, SEC3: 28, SEC4_5: 30, CEGEP: 35, UNI: 40, STUDY_HALL: 20 }),
        terms: "This Private Tutoring Agreement is entered into between J.A.S.S. Tutoring Services and the Tutor.\n\nThe Tutor agrees to provide private tutoring services in accordance with the student's needs and schedule. Hours will be logged through the J.A.S.S. platform and compensated at the rates specified in the Pay Scale for Year 1.\n\nThe Tutor shall maintain professional conduct, arrive on time for all scheduled sessions, and communicate promptly with clients and administration.\n\nThis contract is valid for one academic year and may be renewed upon mutual agreement.",
      },
      {
        name: "Private Tutoring — Year 2",
        type: "PRIVATE_TUTORING",
        yearLevel: "2ND_YEAR",
        isDefault: true,
        rates: JSON.stringify({ ELEMENTARY: 25, SEC1_2: 28, SEC3: 32, SEC4_5: 35, CEGEP: 40, UNI: 45, STUDY_HALL: 22 }),
        terms: "This Private Tutoring Agreement is entered into between J.A.S.S. Tutoring Services and the Tutor.\n\nThe Tutor agrees to provide private tutoring services in accordance with the student's needs and schedule. Hours will be logged through the J.A.S.S. platform and compensated at the rates specified in the Pay Scale for Year 2.\n\nThe Tutor shall maintain professional conduct, arrive on time for all scheduled sessions, and communicate promptly with clients and administration.\n\nYear 2 tutors may also assist in mentoring Year 1 tutors if requested.\n\nThis contract is valid for one academic year and may be renewed upon mutual agreement.",
      },
      {
        name: "Private Tutoring — Year 3",
        type: "PRIVATE_TUTORING",
        yearLevel: "3RD_YEAR",
        isDefault: true,
        rates: JSON.stringify({ ELEMENTARY: 28, SEC1_2: 30, SEC3: 35, SEC4_5: 38, CEGEP: 45, UNI: 50, STUDY_HALL: 25 }),
        terms: "This Private Tutoring Agreement is entered into between J.A.S.S. Tutoring Services and the Tutor.\n\nThe Tutor agrees to provide private tutoring services in accordance with the student's needs and schedule. Hours will be logged through the J.A.S.S. platform and compensated at the rates specified in the Pay Scale for Year 3+.\n\nThe Tutor shall maintain professional conduct, arrive on time for all scheduled sessions, and communicate promptly with clients and administration.\n\nYear 3+ tutors may also take on mentoring roles and assist with tutor matching.\n\nThis contract is valid for one academic year and may be renewed upon mutual agreement.",
      },
      {
        name: "Program Supervisor — Year 1",
        type: "PROGRAM_SUPERVISOR",
        yearLevel: "1ST_YEAR",
        isDefault: true,
        rates: JSON.stringify({ ELEMENTARY: 22, SEC1_2: 25, SEC3: 28, SEC4_5: 30, CEGEP: 35, UNI: 40, STUDY_HALL: 20, in_person_mgmt: 25, online_mgmt: 22, supervision: 20, marketing: 20 }),
        terms: "This Program Supervisor Agreement is entered into between J.A.S.S. Tutoring Services and the Supervisor.\n\nThe Supervisor agrees to oversee study hall programs at partner schools. Responsibilities include program management, student supervision, marketing, and coordination with school administrators.\n\nCompensation is based on the rates specified for each category. Hours must be logged with the appropriate category selected.\n\nThis agreement is valid for one academic year and may be renewed upon mutual agreement.",
      },
      {
        name: "Program Supervisor — Year 2",
        type: "PROGRAM_SUPERVISOR",
        yearLevel: "2ND_YEAR",
        isDefault: true,
        rates: JSON.stringify({ ELEMENTARY: 25, SEC1_2: 28, SEC3: 32, SEC4_5: 35, CEGEP: 40, UNI: 45, STUDY_HALL: 22, in_person_mgmt: 28, online_mgmt: 25, supervision: 22, marketing: 22 }),
        terms: "This Program Supervisor Agreement is entered into between J.A.S.S. Tutoring Services and the Supervisor.\n\nThe Supervisor agrees to oversee study hall programs at partner schools. Responsibilities include program management, student supervision, marketing, and coordination with school administrators.\n\nYear 2 supervisors may also assist with matching tutors to study hall shifts.\n\nCompensation is based on the rates specified for each category. Hours must be logged with the appropriate category selected.\n\nThis agreement is valid for one academic year and may be renewed upon mutual agreement.",
      },
      {
        name: "Program Supervisor — Year 3",
        type: "PROGRAM_SUPERVISOR",
        yearLevel: "3RD_YEAR",
        isDefault: true,
        rates: JSON.stringify({ ELEMENTARY: 28, SEC1_2: 30, SEC3: 35, SEC4_5: 38, CEGEP: 45, UNI: 50, STUDY_HALL: 25, in_person_mgmt: 32, online_mgmt: 28, supervision: 25, marketing: 25 }),
        terms: "This Program Supervisor Agreement is entered into between J.A.S.S. Tutoring Services and the Supervisor.\n\nThe Supervisor agrees to oversee study hall programs at partner schools. Responsibilities include program management, student supervision, marketing, and coordination with school administrators.\n\nYear 3+ supervisors may also manage teams of supervisors and handle client relationships.\n\nCompensation is based on the rates specified for each category. Hours must be logged with the appropriate category selected.\n\nThis agreement is valid for one academic year and may be renewed upon mutual agreement.",
      },
    ],
  })

  console.log("Created 6 contract templates with rates.")
  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
