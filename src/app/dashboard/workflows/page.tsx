import { requireAdmin } from "@/lib/auth-helpers"
import WorkflowsContent from "./workflows-content"

export const dynamic = "force-dynamic"

export default async function WorkflowsPage() {
  await requireAdmin()
  return <WorkflowsContent />
}