"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { SUBJECT_OPTIONS } from "@/lib/constants"

interface City {
  id: string; name: string
}

function CareersForm() {
  const searchParams = useSearchParams()
  const submitted = searchParams.get("submitted") === "1"
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [otherSubject, setOtherSubject] = useState("")
  const [cities, setCities] = useState<City[]>([])

  useEffect(() => {
    fetch("/api/city").then(r => r.json()).then(d => setCities(d.cities || []))
  }, [])

  function toggleSubject(s: string) {
    setSelectedSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const subjectsValue = [...selectedSubjects, otherSubject.trim()].filter(Boolean).join(", ")

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <div className="text-4xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Application Submitted!</h1>
          <p className="text-zinc-600 mb-4">Thank you for applying. We've sent you an email with a link to upload your CV and transcript — please check your inbox (and spam folder).</p>
          <p className="text-sm text-zinc-500">We'll reach out when a matching client is available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Careers at J.A.S.S.</h1>
          <p className="text-zinc-600">Working as a tutor is the most flexible student job out there! At J.A.S.S., you choose your hours, the subjects you teach, and the location of your sessions.</p>
        </div>

        <form action="/api/careers" method="POST" className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">First name *</label>
              <input type="text" name="firstName" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Last name *</label>
              <input type="text" name="lastName" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email *</label>
              <input type="email" name="email" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Phone</label>
              <input type="tel" name="phone" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">City *</label>
              <select name="cityId" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select your city</option>
                {cities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Borough / Neighborhood</label>
              <input type="text" name="borough" placeholder="e.g. NDG, Cote Saint-Luc" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Current studies</label>
            <input type="text" name="currentStudies" placeholder="e.g. B.Sc. Mathematics, McGill" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">What high school did you go to?</label>
            <input type="text" name="highSchool" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Subjects you are interested in tutoring</label>
            <input type="hidden" name="subjects" value={subjectsValue} />
            <div className="flex flex-wrap gap-2 mb-2">
              {SUBJECT_OPTIONS.map(s => {
                const active = selectedSubjects.includes(s)
                return (
                  <button key={s} type="button" onClick={() => toggleSubject(s)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      active ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-300 text-zinc-600 hover:border-zinc-900"
                    }`}>
                    {s}
                  </button>
                )
              })}
            </div>
            <input type="text" placeholder="Other subject..." value={otherSubject} onChange={e => setOtherSubject(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <fieldset className="border border-zinc-200 rounded-lg p-3">
            <legend className="text-sm font-medium text-zinc-700 px-1">Preferred tutoring format</legend>
            <label className="flex items-center gap-2 text-sm text-zinc-600 mt-1">
              <input type="checkbox" name="formatInPerson" className="rounded" /> In-person tutoring
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-600 mt-1">
              <input type="checkbox" name="formatOnline" className="rounded" /> Online tutoring
            </label>
          </fieldset>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Work experience related to tutoring</label>
            <textarea name="workExperience" rows={3} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <button type="submit" className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

export default function CareersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50" />}>
      <CareersForm />
    </Suspense>
  )
}
