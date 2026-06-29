"use client"

import { useState } from "react"
import { STUDY_HALL_GRADE_OPTIONS } from "@/lib/constants"

interface DayOption { id: string; label: string; sessionsCount: number; price: number }
interface Cycle {
  id: string; name: string; slug: string; yearLabel: string; cycleNumber: number
  billingModel: string; startDate: Date; endDate: Date
  registrationOpen: Date | null; registrationClose: Date | null
  preregistrationDeadline: Date | null; preregistrationDiscount: number
  earlyBirdEnabled: boolean; earlyBirdPct: number; earlyBirdDeadline: Date | null
  pricePerSession: number; introText: string; scheduleText: string
  pricingText: string; termsText: string; photoReleaseText: string; status: string
}

export function StudyHallCycleEditor({
  cycle, dayOptions, formConfig,
}: {
  cycle: Cycle
  dayOptions: DayOption[]
  formConfig: Record<string, boolean>
}) {
  const [days, setDays] = useState<DayOption[]>(dayOptions)
  const [toggles, setToggles] = useState<Record<string, boolean>>(formConfig)
  const [billingModel, setBillingModel] = useState(cycle.billingModel)
  const [earlyBirdEnabled, setEarlyBirdEnabled] = useState(cycle.earlyBirdEnabled)

  const isIndividual = billingModel === "INDIVIDUAL"

  function addDay() {
    setDays([...days, { id: "", label: "", sessionsCount: 0, price: 0 }])
  }
  function onDayChange(i: number, dayId: string) {
    const dayLabels: Record<string, string> = {
      mon: "Mondays", tue: "Tuesdays", wed: "Wednesdays", thu: "Thursdays",
      fri: "Fridays", sat: "Saturdays", sun: "Sundays",
    }
    const dayName = dayLabels[dayId] || dayId
    const updated = [...days]
    const count = updated[i].sessionsCount
    updated[i] = {
      ...updated[i],
      id: dayId,
      label: count > 0 ? `${dayName} (${count} total sessions)` : dayName,
    }
    setDays(updated)
  }
  function onSessionsChange(i: number, count: number) {
    const dayLabels: Record<string, string> = {
      mon: "Mondays", tue: "Tuesdays", wed: "Wednesdays", thu: "Thursdays",
      fri: "Fridays", sat: "Saturdays", sun: "Sundays",
    }
    const updated = [...days]
    const dayId = updated[i].id
    const dayName = dayLabels[dayId] || dayId || ""
    updated[i] = {
      ...updated[i],
      sessionsCount: count,
      label: dayId ? `${dayName} (${count} total sessions)` : updated[i].label,
      price: Math.round(cycle.pricePerSession * count * 100) / 100,
    }
    setDays(updated)
  }
  function removeDay(i: number) {
    setDays(days.filter((_, idx) => idx !== i))
  }

  function toggle(key: string, value: boolean) {
    setToggles({ ...toggles, [key]: value })
  }

  function toDateInput(d: Date | null): string {
    if (!d) return ""
    return new Date(d).toISOString().split("T")[0]
  }

  return (
    <form action={`/api/study-hall/cycles/${cycle.id}`} method="POST" className="mt-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 space-y-6">
      <input type="hidden" name="_action" value="update" />
      <input type="hidden" name="billingModel" value={billingModel} />
      <input type="hidden" name="dayOptions" value={JSON.stringify(days)} />
      <input type="hidden" name="formConfig" value={JSON.stringify(toggles)} />
      <input type="hidden" name="gradeOptions" value={JSON.stringify([...STUDY_HALL_GRADE_OPTIONS])} />

      {/* Basic info */}
      <section>
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Basic Information</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-500 mb-1">Cycle name</label>
            <input type="text" name="name" defaultValue={cycle.name}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-zinc-400 mt-1">Registration URL: <span className="text-blue-500">/study-hall/{cycle.slug}</span></p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Year label</label>
            <input type="text" name="yearLabel" defaultValue={cycle.yearLabel} placeholder="2025-2026"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Cycle number</label>
            <input type="number" name="cycleNumber" defaultValue={cycle.cycleNumber} min="1"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-500 mb-1">Billing model</label>
            <select name="billingModel" value={billingModel} onChange={e => setBillingModel(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="INDIVIDUAL">Individual (we register & invoice each parent)</option>
              <option value="LUMP_SUM_ROSTER">Lump Sum + Roster (school sends list, one invoice)</option>
              <option value="LUMP_SUM">Lump Sum (no registration)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Dates & Pricing */}
      <section>
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Dates & Pricing</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Start date</label>
            <input type="date" name="startDate" defaultValue={toDateInput(cycle.startDate)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">End date</label>
            <input type="date" name="endDate" defaultValue={toDateInput(cycle.endDate)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Price per session ($)</label>
            <input type="number" name="pricePerSession" step="0.01" defaultValue={cycle.pricePerSession}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {isIndividual && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Registration opens</label>
                <input type="date" name="registrationOpen" defaultValue={toDateInput(cycle.registrationOpen)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Registration closes</label>
                <input type="date" name="registrationClose" defaultValue={toDateInput(cycle.registrationClose)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Discounts & Deadlines - only for INDIVIDUAL */}
      {isIndividual && (
        <section>
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Discounts & Deadlines</h4>
          <div className="space-y-4">
            {/* Pre-registration */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
              <h5 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">Pre-registration Discount</h5>
              <p className="text-xs text-zinc-400 mb-2">Register before this date to get a fixed $ amount off. Shows at the top of the form.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Pre-reg deadline</label>
                  <input type="date" name="preregistrationDeadline" defaultValue={toDateInput(cycle.preregistrationDeadline)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Pre-reg discount ($)</label>
                  <input type="number" name="preregistrationDiscount" step="1" min="0" defaultValue={cycle.preregistrationDiscount}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Early bird */}
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                <input type="checkbox" checked={earlyBirdEnabled} onChange={e => setEarlyBirdEnabled(e.target.checked)} className="rounded" />
                Early Bird Discount
              </label>
              <p className="text-xs text-zinc-400 mb-2">Creates a discount code automatically and shows the deadline at the top of the form.</p>
              <input type="hidden" name="earlyBirdEnabled" value={String(earlyBirdEnabled)} />
              {earlyBirdEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Early bird % off</label>
                    <input type="number" name="earlyBirdPct" step="0.01" defaultValue={cycle.earlyBirdPct} placeholder="10"
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Early bird deadline</label>
                    <input type="date" name="earlyBirdDeadline" defaultValue={toDateInput(cycle.earlyBirdDeadline)}
                      className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Day options - only for INDIVIDUAL */}
      {isIndividual && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Session Options</h4>
            <button type="button" onClick={addDay} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">+ Add day</button>
          </div>
          <p className="text-xs text-zinc-400 mb-2">Parents select which days they want. Price auto-calculates as ${cycle.pricePerSession.toFixed(2)} × sessions.</p>
          {days.length === 0 && <p className="text-xs text-zinc-400">No days configured. Add at least one (e.g. Mondays, 8 sessions).</p>}
          <div className="space-y-2">
            {days.map((day, i) => {
              const autoPrice = cycle.pricePerSession * day.sessionsCount
              return (
                <div key={i} className="flex gap-2 items-center bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-2">
                  <select value={day.id} onChange={e => onDayChange(i, e.target.value)}
                    className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100">
                    <option value="">Select day...</option>
                    <option value="mon">Mondays</option>
                    <option value="tue">Tuesdays</option>
                    <option value="wed">Wednesdays</option>
                    <option value="thu">Thursdays</option>
                    <option value="fri">Fridays</option>
                    <option value="sat">Saturdays</option>
                    <option value="sun">Sundays</option>
                  </select>
                  <input type="number" placeholder="Sessions" min="0" value={day.sessionsCount || ""} onChange={e => onSessionsChange(i, parseInt(e.target.value) || 0)}
                    className="w-24 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100" />
                  <span className="text-xs text-zinc-500 w-20 text-right">${autoPrice.toFixed(2)}</span>
                  <button type="button" onClick={() => removeDay(i)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Form fields toggle - only for INDIVIDUAL */}
      {isIndividual && (
        <section>
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Form Fields</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { key: "showLanguage", label: "First language" },
              { key: "showChildNotes", label: "Child notes" },
              { key: "showReferral", label: "Referral field" },
              { key: "showDiscountCode", label: "Discount code field" },
              { key: "showTerms", label: "Terms of service" },
              { key: "showSignature", label: "Signature field" },
              { key: "showPhotoRelease", label: "Photo/video release" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <input type="checkbox" checked={toggles[key] ?? false} onChange={e => toggle(key, e.target.checked)}
                  className="rounded" />
                {label}
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Text blocks - only for INDIVIDUAL */}
      {isIndividual && (
        <section>
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Form Text Blocks</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Intro text (generic program description)</label>
              <textarea name="introText" rows={6} defaultValue={cycle.introText}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Schedule text</label>
              <textarea name="scheduleText" rows={3} defaultValue={cycle.scheduleText}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Pricing text</label>
              <textarea name="pricingText" rows={3} defaultValue={cycle.pricingText}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Terms of service text</label>
              <textarea name="termsText" rows={6} defaultValue={cycle.termsText}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Photo/video release text</label>
              <textarea name="photoReleaseText" rows={6} defaultValue={cycle.photoReleaseText}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </section>
      )}

      <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
        Save Changes
      </button>
    </form>
  )
}
