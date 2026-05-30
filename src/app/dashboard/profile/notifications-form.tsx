"use client"

export default function NotificationsForm({ emailNotifications, smsNotifications }: { emailNotifications: boolean; smsNotifications: boolean }) {
  return (
    <form action="/api/profile/notifications" method="POST" className="space-y-4">
      <label className="flex items-center gap-3">
        <input type="checkbox" name="emailNotifications" defaultChecked={emailNotifications} className="rounded" />
        <div>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Email notifications</span>
          <p className="text-xs text-zinc-500">Receive automatic emails from J.A.S.S.</p>
        </div>
      </label>
      <label className="flex items-center gap-3">
        <input type="checkbox" name="smsNotifications" defaultChecked={smsNotifications} className="rounded" />
        <div>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">SMS notifications</span>
          <p className="text-xs text-zinc-500">Receive text message alerts</p>
        </div>
      </label>
      <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Save Preferences</button>
    </form>
  )
}