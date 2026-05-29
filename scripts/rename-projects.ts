import { PrismaClient } from "@prisma/client"

const p = new PrismaClient()

const GRADE_LABELS: Record<string, string> = {
  ELEMENTARY: "Elementary", SEC1_2: "Sec 1-2", SEC3: "Sec 3",
  SEC4_5: "Sec 4-5", CEGEP: "CEGEP", UNI: "University",
  STUDY_HALL: "Study Hall", PROGRAM_SUPERVISOR: "Program Supervisor",
}

async function main() {
  const projects = await p.project.findMany({
    where: { projectType: "STUDENT" },
    include: { client: { include: { user: { select: { name: true } } } } },
  })

  for (const proj of projects) {
    const grade = GRADE_LABELS[proj.gradeLevel] || proj.gradeLevel
    const clientName = proj.client?.user.name || "Other"
    const newName = `${proj.name.split(" — ")[0]} — ${grade} (${clientName})`
    await p.project.update({ where: { id: proj.id }, data: { name: newName } })
    console.log(`  ${proj.name} → ${newName}`)
  }

  console.log(`\nRenamed ${projects.length} projects.`)
  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
