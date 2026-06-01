import { auth } from "@/lib/auth"
import DashboardShell from "@/components/dashboard-shell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const role = session?.user?.role ?? null
  return <DashboardShell role={role}>{children}</DashboardShell>
}