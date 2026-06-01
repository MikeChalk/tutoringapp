"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { TENURE_LABELS, GRADE_LABELS } from "@/lib/constants"

interface TutorDetailEditProps {
  tutor: {
    id: string
    tenure: string
    gradeLevels: string | null
    subjects: string | null
    bio: string | null
    phone: string | null
    isActive: boolean
  }
}

export default function TutorDetailEdit({ tutor }: TutorDetailEditProps) {
  const [editing, setEditing] = useState(false)
  const router = useRouter()
  const [tenure, setTenure] = useState(tutor.tenure)
  const [gradeLevels, setGradeLevels] = useState(tutor.gradeLevels || "")
  const [subjects, setSubjects] = useState(tutor.subjects || "")
  const [phone, setPhone] = useState(tutor.phone || "")
  const [bio, setBio] = useState(tutor.bio || "")

  const tenureOptions = Object.entries(TENURE_LABELS).map(([k, v]) => (
    <option key={k} value={k}>{v}</option>
  ))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const formData = new FormData()
    formData.append("tutorId", tutor.id)
    formData.append("tenure", tenure)
    formData.append("gradeLevels", gradeLevels)
    formData.append("subjects", subjects)
    formData.append("phone", phone)
    formData.append("bio", bio)

    const res = await fetch("/api/tutors/edit", { method: "POST", body: formData })
    if (res.ok || res.status === 303) {
      toast.success("Profile updated")
      setEditing(false)
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({ error: "Failed" }))
      toast.error(data.error || "Failed to update profile")
    }
  }

  if (!editing) {
    return (
      <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Profile</h3>
        </div>
        <dl className="space-y-3 text-sm mb-4">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Tenure</dt>
            <dd className="text-zinc-900 dark:text-zinc-100 font-medium">{TENURE_LABELS[tutor.tenure] || tutor.tenure}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Grades</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{tutor.gradeLevels ? tutor.gradeLevels.split(",").map(g => GRADE_LABELS[g] || g).join(", ") : "-"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Subjects</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{tutor.subjects || "-"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Status</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{tutor.isActive ? "Active" : "Inactive"}</dd>
          </div>
          {tutor.bio && (
            <div>
              <dt className="text-zinc-500 mb-1">Bio</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{tutor.bio}</dd>
            </div>
          )}
        </dl>
        <button onClick={() => setEditing(true)}
          className="w-full rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 p-3 text-sm font-medium text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
          Edit Profile
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Edit Profile</h3>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tenure</label>
          <select value={tenure} onChange={e => setTenure(e.target.value)} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {tenureOptions}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Grade Levels (comma-separated)</label>
          <input type="text" value={gradeLevels} onChange={e => setGradeLevels(e.target.value)} placeholder="e.g. ELEMENTARY,SEC1_2,SEC3" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Subjects</label>
          <input type="text" value={subjects} onChange={e => setSubjects(e.target.value)} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Phone</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Save Changes</button>
      </form>
    </div>
  )
}
