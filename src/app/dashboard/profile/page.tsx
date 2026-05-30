"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [name, setName] = useState(session?.user?.name || "")
  const [email, setEmail] = useState(session?.user?.email || "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault()
    setMessage(""); setError("")
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ name, email, _action: "profile" }),
    })
    const data = await res.json()
    if (data.error) setError(data.error)
    else { setMessage("Profile updated"); router.refresh() }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setMessage(""); setError("")
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ currentPassword, newPassword, _action: "password" }),
    })
    const data = await res.json()
    if (data.error) setError(data.error)
    else { setMessage("Password changed"); setCurrentPassword(""); setNewPassword("") }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Profile</h2>

      {message && <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl p-3 mb-4 text-sm text-green-700 dark:text-green-300">{message}</div>}
      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl p-3 mb-4 text-sm text-red-600 dark:text-red-400">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Edit Profile</h3>
          <form onSubmit={handleProfile} className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Save</button>
          </form>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Change Password</h3>
          <form onSubmit={handlePassword} className="space-y-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Current Password</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Change Password</button>
          </form>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Notification Preferences</h3>
          <form action="/api/profile/notifications" method="POST" className="space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" name="emailNotifications" defaultChecked className="rounded" />
              <div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Email notifications</span>
                <p className="text-xs text-zinc-500">Receive automatic emails from J.A.S.S.</p>
              </div>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" name="smsNotifications" className="rounded" />
              <div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">SMS notifications</span>
                <p className="text-xs text-zinc-500">Receive text message alerts</p>
              </div>
            </label>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Save Preferences</button>
          </form>
        </div>
      </div>

      {session?.user?.role === "CLIENT" && (
        <div className="mt-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Request a Tutor</h3>
          <p className="text-sm text-zinc-500 mb-4">Need academic support? Submit a tutoring request and we&apos;ll match you with the perfect tutor.</p>
          <Link
            href="/request-tutor"
            className="inline-block rounded-lg bg-zinc-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
          >
            Request a Tutor
          </Link>
        </div>
      )}
    </div>
  )
}
