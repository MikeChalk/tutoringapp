import { requireAdmin } from "@/lib/auth-helpers"
import MassEmailContent from "./mass-email-content"

export const dynamic = "force-dynamic"

export default async function EmailPage() {
  await requireAdmin()
  return <MassEmailContent />
}