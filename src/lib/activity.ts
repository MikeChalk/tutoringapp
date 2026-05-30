import { prisma } from "@/lib/db"

export async function logActivity(userId: string, action: string, entity: string, entityId?: string | null, details?: string | null) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, entity, entityId, details },
    })
  } catch { /* log unavailable */ }
}
