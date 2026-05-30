"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { STUDENT_GRADE_OPTIONS, SUBJECT_OPTIONS } from "@/lib/constants"
import CopyLinkButton from "@/components/copy-link-button"

const GRADE_ENTRIES = Object.entries(STUDENT_GRADE_OPTIONS).filter(([k]) => k !== "STUDY_HALL" && k !== "PROGRAM_SUPERVISOR")

function RequestTutorForm() {
  const searchParams = useSearchParams()
  const submitted = searchParams.get("submitted") === "1"

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [otherSubject, setOtherSubject] = useState("")
  const [discountCodes, setDiscountCodes] = useState<Array<{ code: string; description: string; discountPct: number; discountAmt: number }>>([])

  useEffect(() => {
    fetch("/api/discounts").then(r => r.json()).then(d => setDiscountCodes(d.codes?.filter((c: { isActive: boolean }) => c.isActive) || []))
  }, [])

  function toggleSubject(s: string) {
    setSelectedSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <div className="text-4xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Request Submitted!</h1>
          <p className="text-zinc-600 mb-4">Thank you! We&apos;ll review your request and match you with a tutor shortly. You&apos;ll hear from us at the email you provided.</p>
          <p className="text-sm text-zinc-500">Questions? Call us at 514-967-3515 or email info@jasstutors.com</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">Get a Tutor Today</h1>
          <p className="text-zinc-600">Fill out the form below and we&apos;ll match you with the perfect tutor for your child.</p>
        </div>

        <form action="/api/request-tutor" method="POST" className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
          <div className="flex items-center justify-end">
            <CopyLinkButton />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Parent full name *</label>
              <input type="text" name="name" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Student full name *</label>
              <input type="text" name="studentName" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Phone number *</label>
              <input type="tel" name="phone" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Contact email *</label>
              <input type="email" name="email" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <fieldset className="border border-zinc-200 rounded-lg p-3">
            <legend className="text-sm font-medium text-zinc-700 px-1">Tutoring preference (select all that apply) *</legend>
            <label className="flex items-center gap-2 text-sm text-zinc-600 mt-1">
              <input type="checkbox" name="prefInPerson" className="rounded" /> In-person
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-600 mt-1">
              <input type="checkbox" name="prefOnline" className="rounded" /> Online
            </label>
          </fieldset>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Address of tutoring sessions</label>
            <input type="text" name="address" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Grade level *</label>
              <select name="gradeLevel" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select grade level</option>
                {GRADE_ENTRIES.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">School *</label>
              <input type="text" name="school" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">What subject(s) does your child need help with?</label>
            <input type="hidden" name="subject" value={[...selectedSubjects, otherSubject.trim()].filter(Boolean).join(", ")} />
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

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              How often would you like sessions? Describe the type of academic support your child needs. *
            </label>
            <textarea name="description" required rows={4}
              placeholder="e.g. Weekly math help for Sec 4, preparing for ministry exams..."
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Discount Code (if applicable)</label>
            {discountCodes.length > 0 ? (
              <select name="discountCode" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">None</option>
                {discountCodes.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code}{c.description ? ` — ${c.description}` : ""} ({c.discountPct > 0 ? `${c.discountPct}%` : `$${c.discountAmt.toFixed(2)}`})
                  </option>
                ))}
              </select>
            ) : (
              <input type="text" name="discountCode" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter code" />
            )}
          </div>

          <button type="submit" className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

export default function RequestTutorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50" />}>
      <RequestTutorForm />
    </Suspense>
  )
}
