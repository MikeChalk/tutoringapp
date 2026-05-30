import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth-helpers"
import ProfileClient from "./profile-client"

export default async function ProfilePage() {
  const session = await requireAuth()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailNotifications: true, smsNotifications: true },
  })

  return <ProfileClient emailNotifications={user?.emailNotifications ?? true} smsNotifications={user?.smsNotifications ?? false} />
}