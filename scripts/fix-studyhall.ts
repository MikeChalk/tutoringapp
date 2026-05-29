import { PrismaClient } from "@prisma/client"
const p = new PrismaClient()
async function main() {
  const r = await p.project.updateMany({
    where: { projectType: "STUDY_HALL" },
    data: { subjects: "All Subjects" },
  })
  console.log("Updated", r.count, "projects")
  await p.$disconnect()
}
main()
