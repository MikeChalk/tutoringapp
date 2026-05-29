import { PrismaClient } from "@prisma/client"

const p = new PrismaClient()

async function main() {
  const existing = await p.contractTemplate.count()
  if (existing > 0) {
    console.log("Templates already exist, skipping.")
    await p.$disconnect()
    return
  }

  await p.contractTemplate.createMany({
    data: [
      {
        name: "Private Tutoring — Year 1",
        type: "PRIVATE_TUTORING",
        yearLevel: "1ST_YEAR",
        isDefault: true,
        gradeLevels: "ELEMENTARY,SEC1_2,SEC3,SEC4_5,CEGEP,UNI",
        terms: "This Private Tutoring Agreement is entered into between J.A.S.S. Tutoring Services and the Tutor.\n\nThe Tutor agrees to provide private tutoring services in accordance with the student's needs and schedule. Hours will be logged through the J.A.S.S. platform and compensated at the rates specified in the Pay Scale for Year 1.\n\nThe Tutor shall maintain professional conduct, arrive on time for all scheduled sessions, and communicate promptly with clients and administration.\n\nThis contract is valid for one academic year and may be renewed upon mutual agreement.",
      },
      {
        name: "Private Tutoring — Year 2",
        type: "PRIVATE_TUTORING",
        yearLevel: "2ND_YEAR",
        isDefault: true,
        gradeLevels: "ELEMENTARY,SEC1_2,SEC3,SEC4_5,CEGEP,UNI",
        terms: "This Private Tutoring Agreement is entered into between J.A.S.S. Tutoring Services and the Tutor.\n\nThe Tutor agrees to provide private tutoring services in accordance with the student's needs and schedule. Hours will be logged through the J.A.S.S. platform and compensated at the rates specified in the Pay Scale for Year 2.\n\nThe Tutor shall maintain professional conduct, arrive on time for all scheduled sessions, and communicate promptly with clients and administration.\n\nYear 2 tutors may also assist in mentoring Year 1 tutors if requested.\n\nThis contract is valid for one academic year and may be renewed upon mutual agreement.",
      },
      {
        name: "Private Tutoring — Year 3",
        type: "PRIVATE_TUTORING",
        yearLevel: "3RD_YEAR",
        isDefault: true,
        gradeLevels: "ELEMENTARY,SEC1_2,SEC3,SEC4_5,CEGEP,UNI",
        terms: "This Private Tutoring Agreement is entered into between J.A.S.S. Tutoring Services and the Tutor.\n\nThe Tutor agrees to provide private tutoring services in accordance with the student's needs and schedule. Hours will be logged through the J.A.S.S. platform and compensated at the rates specified in the Pay Scale for Year 3+.\n\nThe Tutor shall maintain professional conduct, arrive on time for all scheduled sessions, and communicate promptly with clients and administration.\n\nYear 3+ tutors may also take on mentoring roles and assist with tutor matching.\n\nThis contract is valid for one academic year and may be renewed upon mutual agreement.",
      },
      {
        name: "Study Hall Agreement — Year 1",
        type: "STUDY_HALL",
        yearLevel: "1ST_YEAR",
        isDefault: true,
        gradeLevels: "ELEMENTARY,SEC1_2,SEC3,SEC4_5,CEGEP,UNI",
        terms: "This Study Hall Agreement is entered into between J.A.S.S. Tutoring Services and the Supervisor.\n\nThe Supervisor agrees to oversee study hall sessions at the assigned school location. Responsibilities include maintaining a productive study environment, tracking attendance, and providing general academic support to students.\n\nCompensation is based on hourly rates specified in the Pay Scale for Year 1 under the Study Hall category.\n\nThis agreement is valid for one academic year and may be renewed upon mutual agreement.",
      },
      {
        name: "Study Hall Agreement — Year 2",
        type: "STUDY_HALL",
        yearLevel: "2ND_YEAR",
        isDefault: true,
        gradeLevels: "ELEMENTARY,SEC1_2,SEC3,SEC4_5,CEGEP,UNI",
        terms: "This Study Hall Agreement is entered into between J.A.S.S. Tutoring Services and the Supervisor.\n\nThe Supervisor agrees to oversee study hall sessions at the assigned school location. Responsibilities include maintaining a productive study environment, tracking attendance, and providing general academic support to students.\n\nCompensation is based on hourly rates specified in the Pay Scale for Year 2 under the Study Hall category.\n\nYear 2 supervisors may also assist with coordinating study hall schedules.\n\nThis agreement is valid for one academic year and may be renewed upon mutual agreement.",
      },
      {
        name: "Program Supervisor Agreement",
        type: "PROGRAM_SUPERVISOR",
        yearLevel: "3RD_YEAR",
        isDefault: true,
        gradeLevels: "ELEMENTARY,SEC1_2,SEC3,SEC4_5,CEGEP,UNI",
        terms: "This Program Supervisor Agreement is entered into between J.A.S.S. Tutoring Services and the Supervisor.\n\nThe Supervisor agrees to oversee a program of tutors and students, manage scheduling, ensure quality of tutoring services, and report to administration.\n\nCompensation is based on rates specified in the Pay Scale for Year 3+ under the Program Supervisor category.\n\nAdditional responsibilities include tutor matching, quality assurance checks, and client communication.\n\nThis agreement is valid for one academic year and may be renewed upon mutual agreement.",
      },
    ],
  })

  console.log("Created 6 default contract templates.")
  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
