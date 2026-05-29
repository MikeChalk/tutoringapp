import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const p = new PrismaClient()

async function main() {
  // Fully onboard all existing tutors
  await p.tutor.updateMany({
    data: { onboarded: true, onboardingStep: 6, onboardedAt: new Date() },
  })

  // Create new onboarding tutors
  const montrealId = "cmpqikyfc000011u2rqcv5bky"
  const newTutors = [
    { name: "Emma Williams", email: "emma.w@email.com", tenure: "1ST_YEAR", subjects: "Math, Science", gradeLevels: "ELEMENTARY,SEC1_2", bio: "B.Ed student at McGill" },
    { name: "Omar Hassan", email: "omar.h@email.com", tenure: "2ND_YEAR", subjects: "Physics, Chemistry, Math", gradeLevels: "SEC3,SEC4_5,CEGEP", bio: "Engineering student at Concordia" },
    { name: "Priya Sharma", email: "priya.s@email.com", tenure: "1ST_YEAR", subjects: "English, French, History", gradeLevels: "SEC1_2,SEC3,SEC4_5", bio: "Literature student at UdeM" },
  ]

  for (const t of newTutors) {
    const existing = await p.user.findUnique({ where: { email: t.email } })
    if (existing) continue
    const hashed = await bcrypt.hash("tutor123", 12)
    const user = await p.user.create({
      data: { name: t.name, email: t.email, password: hashed, role: "TUTOR", cityId: montrealId },
    })
    await p.tutor.create({
      data: {
        userId: user.id,
        tenure: t.tenure,
        subjects: t.subjects,
        gradeLevels: t.gradeLevels,
        bio: t.bio,
        isActive: true,
        onboarded: false,
        onboardingStep: 0,
      },
    })
    console.log(`  Created: ${t.name} (${t.email})`)
  }

  console.log("Done — existing tutors fully onboarded, 3 new tutors in onboarding.")
  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
