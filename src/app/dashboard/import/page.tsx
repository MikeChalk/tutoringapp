import { requireAdmin } from "@/lib/auth-helpers"
import ImportContent from "./import-content"

export const dynamic = "force-dynamic"

export default async function ImportPage() {
  await requireAdmin()
  return <ImportContent />
}