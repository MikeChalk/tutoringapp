import { prisma } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import bcrypt from "bcryptjs"

export default async function InvitePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params

  const user = await prisma.user.findUnique({
    where: { signupToken: token },
    include: { client: { select: { id: true } } },
  })

  if (!user?.client) notFound()

  async function setPassword(formData: FormData) {
    "use server"
    const password = formData.get("password") as string
    const confirm = formData.get("confirm") as string
    if (!password || password.length < 6) return
    if (password !== confirm) return

    const hashed = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: user!.id },
      data: { password: hashed, signupToken: null },
    })
    redirect("/login?setup=1")
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Welcome, {user!.name}</h1>
        <p className="text-sm text-zinc-500 mb-6">Set your password to access your J.A.S.S. account.</p>

        <form action={setPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
            <input type="password" name="password" required minLength={6}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Confirm Password</label>
            <input type="password" name="confirm" required minLength={6}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit"
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            Set Password & Sign In
          </button>
        </form>
      </div>
    </div>
  )
}
