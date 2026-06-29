"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import CopyLinkButton from "@/components/copy-link-button"

interface DayOption { id: string; label: string; sessionsCount: number; price: number }
interface DiscountCode { code: string; description: string; discountPct: number; discountAmt: number }
interface CycleConfig {
  id: string
  name: string
  billingModel: string
  pricePerSession: number
  dayOptions: DayOption[]
  gradeOptions: string[]
  formConfig: Record<string, boolean>
  introText: string
  scheduleText: string
  pricingText: string
  termsText: string
  photoReleaseText: string
  preregistrationDeadline: string | null
  preregistrationDiscount: number
  earlyBirdEnabled: boolean
  earlyBirdPct: number
  earlyBirdDeadline: string | null
  startDate: string
  endDate: string
}

export default function StudyHallRegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()

  const [cycle, setCycle] = useState<CycleConfig | null>(null)
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [discountCode, setDiscountCode] = useState("")
  const [photoRelease, setPhotoRelease] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)

  useEffect(() => {
    fetch(`/api/study-hall/cycle/${slug}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null }
        return r.json()
      })
      .then(d => {
        if (d) {
          setCycle(d.cycle)
          setDiscountCodes(d.discountCodes || [])
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return <div className="min-h-screen bg-zinc-50 flex items-center justify-center"><p className="text-zinc-500">Loading...</p></div>
  }

  if (notFound || !cycle) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Registration Not Found</h1>
          <p className="text-zinc-600">This study hall registration link is invalid or no longer active.</p>
        </div>
      </div>
    )
  }

  if (cycle.billingModel === "LUMP_SUM" || cycle.billingModel === "LUMP_SUM_ROSTER") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">{cycle.name}</h1>
          <p className="text-zinc-600">Registration for this program is handled by your school. Please contact your school administration for details.</p>
        </div>
      </div>
    )
  }

  const showLanguage = cycle.formConfig.showLanguage
  const showChildNotes = cycle.formConfig.showChildNotes
  const showReferral = cycle.formConfig.showReferral
  const showDiscountCode = cycle.formConfig.showDiscountCode
  const showTerms = cycle.formConfig.showTerms
  const showSignature = cycle.formConfig.showSignature
  const showPhotoRelease = cycle.formConfig.showPhotoRelease

  const selectedDayOptions = cycle.dayOptions.filter(d => selectedDays.includes(d.id))
  const subtotal = selectedDayOptions.reduce((s, d) => s + d.price, 0)
  const sessionsCount = selectedDayOptions.reduce((s, d) => s + d.sessionsCount, 0)

  const matchedDiscount = discountCodes.find(dc => dc.code.toUpperCase() === discountCode.toUpperCase().trim())
  let discountAmount = 0
  let discountPct = 0
  if (matchedDiscount) {
    discountPct = matchedDiscount.discountPct
    discountAmount = matchedDiscount.discountAmt
  }
  const pctDiscount = Math.round(subtotal * (discountPct / 100) * 100) / 100
  const totalDiscount = Math.round((pctDiscount + discountAmount) * 100) / 100

  let preregDiscount = 0
  if (cycle.preregistrationDeadline && cycle.preregistrationDiscount > 0) {
    if (new Date() <= new Date(cycle.preregistrationDeadline)) {
      preregDiscount = cycle.preregistrationDiscount
    }
  }

  const total = Math.max(0, Math.round((subtotal - totalDiscount - preregDiscount) * 100) / 100)

  function toggleDay(dayId: string) {
    setSelectedDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (selectedDays.length === 0) { toast.error("Please select at least one day"); return }
    if (showPhotoRelease && !photoRelease) { toast.error("Please select an option for the photo/video release"); return }
    if (showTerms && !termsAccepted) { toast.error("Please accept the terms of service"); return }

    setSubmitting(true)
    const formData = new FormData(e.currentTarget)
    formData.set("daySelections", JSON.stringify(selectedDays))
    formData.set("sessionsCount", String(sessionsCount))
    formData.set("subtotal", String(subtotal))
    formData.set("discountPct", String(discountPct))
    formData.set("discountAmount", String(discountAmount))
    formData.set("preregDiscount", String(preregDiscount))
    formData.set("totalAmount", String(total))

    try {
      const res = await fetch(`/api/study-hall/register/${slug}`, { method: "POST", body: formData })
      const data = await res.json()
      if (res.ok) {
        router.push(`/study-hall/${slug}?submitted=1`)
      } else {
        toast.error(data.error || "Registration failed")
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const submitted = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("submitted") === "1"

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <div className="text-4xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Registration Received!</h1>
          <p className="text-zinc-600 mb-4">Thank you! We&apos;ve received your registration for <strong>{cycle.name}</strong>. You will receive a confirmation email with your invoice once we verify your spot.</p>
          <p className="text-sm text-zinc-500">Questions? Email us at info@jasstutors.com</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">{cycle.name}</h1>
          <div className="flex justify-end">
            <CopyLinkButton />
          </div>
        </div>

        {/* Discount deadline banners */}
        <div className="space-y-2 mb-6">
          {cycle.earlyBirdEnabled && cycle.earlyBirdDeadline && cycle.earlyBirdPct > 0 && (
            new Date() <= new Date(cycle.earlyBirdDeadline) ? (() => {
              const earlyBirdCode = discountCodes.find(dc => dc.code.startsWith("EARLYBIRD"))
              return (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-4 text-center">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                    EARLY BIRD DISCOUNT: {cycle.earlyBirdPct}% off — ends {new Date(cycle.earlyBirdDeadline).toLocaleDateString()}
                  </p>
                  {earlyBirdCode && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Use code <strong>{earlyBirdCode.code}</strong> at checkout
                    </p>
                  )}
                </div>
              )
            })() : null
          )}
          {cycle.preregistrationDeadline && cycle.preregistrationDiscount > 0 && (
            new Date() <= new Date(cycle.preregistrationDeadline) ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4 text-center">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                  PRE-REGISTRATION DISCOUNT: ${cycle.preregistrationDiscount.toFixed(2)} off — register before {new Date(cycle.preregistrationDeadline).toLocaleDateString()}
                </p>
              </div>
            ) : null
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {cycle.introText && (
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <div className="prose prose-sm max-w-none text-sm text-zinc-700 whitespace-pre-wrap">{cycle.introText}</div>
            </div>
          )}

          {(cycle.scheduleText || cycle.pricingText) && (
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h2 className="text-lg font-bold text-zinc-900 mb-3">Schedule and Pricing</h2>
              {cycle.scheduleText && <div className="prose prose-sm max-w-none text-sm text-zinc-700 whitespace-pre-wrap mb-3">{cycle.scheduleText}</div>}
              {cycle.pricingText && <div className="prose prose-sm max-w-none text-sm text-zinc-700 whitespace-pre-wrap">{cycle.pricingText}</div>}
            </div>
          )}

          {/* Personal Information */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <h2 className="text-lg font-bold text-zinc-900 mb-4">Personal Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Parent&apos;s full name *</label>
                  <input type="text" name="parentName" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Student&apos;s full name *</label>
                  <input type="text" name="studentName" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Parent&apos;s phone number *</label>
                  <input type="tel" name="parentPhone" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Parent&apos;s email *</label>
                  <input type="email" name="parentEmail" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Grade *</label>
                  {cycle.gradeOptions.length > 0 ? (
                    <select name="grade" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">Select grade...</option>
                      {cycle.gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  ) : (
                    <input type="text" name="grade" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  )}
                </div>
                {showLanguage && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">First language *</label>
                    <select name="firstLanguage" required className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">Select...</option>
                      <option value="English">English</option>
                      <option value="French">French</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Registration */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <h2 className="text-lg font-bold text-zinc-900 mb-4">Registration</h2>
            <p className="text-sm text-zinc-600 mb-4">Select all days that apply. The base registration cost is ${cycle.pricePerSession.toFixed(2)}/hourly session.</p>

            <div className="space-y-2 mb-4">
              {cycle.dayOptions.map(day => (
                <label key={day.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedDays.includes(day.id) ? "border-blue-500 bg-blue-50" : "border-zinc-200 hover:border-zinc-300"
                }`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedDays.includes(day.id)} onChange={() => toggleDay(day.id)} className="rounded" />
                    <span className="text-sm font-medium text-zinc-900">{day.label}</span>
                  </div>
                  <span className="text-sm text-zinc-600">${day.price.toFixed(2)}</span>
                </label>
              ))}
            </div>

            {showChildNotes && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Is there anything we should know about your child?</label>
                <p className="text-xs text-zinc-400 mb-1">E.g: Do they have any specific study habits? What types of people do they work best with?</p>
                <textarea name="childNotes" rows={3} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}

            {showReferral && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Did another parent refer you?</label>
                <p className="text-xs text-zinc-400 mb-1">Parents receive a FREE Study Hall session per new Study Hall parent they refer to the program!</p>
                <input type="text" name="referrerName" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}

            {showDiscountCode && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Discount code</label>
                <input type="text" value={discountCode} onChange={e => setDiscountCode(e.target.value)} placeholder="Enter code (if applicable)" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {discountCode && !matchedDiscount && (
                  <p className="text-xs text-red-500 mt-1">Invalid code</p>
                )}
              </div>
            )}
          </div>

          {/* Terms of Service */}
          {showTerms && (
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h2 className="text-lg font-bold text-zinc-900 mb-3">Terms of Service</h2>
              <div className="prose prose-sm max-w-none text-sm text-zinc-700 whitespace-pre-wrap mb-4 max-h-64 overflow-y-auto bg-zinc-50 rounded-lg p-4">{cycle.termsText}</div>
              <label className="flex items-center gap-2 text-sm text-zinc-700 mb-3">
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="rounded" />
                I have read and accept the Terms of Service
              </label>
              {showSignature && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Sign below (type your full name) *</label>
                  <input type="text" name="termsSignature" required={termsAccepted} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>
          )}

          {/* Photo/Video Release */}
          {showPhotoRelease && (
            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h2 className="text-lg font-bold text-zinc-900 mb-3">Photo/Video Release Form</h2>
              <div className="prose prose-sm max-w-none text-sm text-zinc-700 whitespace-pre-wrap mb-4 max-h-48 overflow-y-auto bg-zinc-50 rounded-lg p-4">{cycle.photoReleaseText}</div>
              <p className="text-sm font-medium text-zinc-700 mb-2">Please check one *</p>
              <div className="space-y-2">
                <label className={`flex items-center gap-2 text-sm p-2 rounded-lg border cursor-pointer ${photoRelease === "AGREED" ? "border-blue-500 bg-blue-50" : "border-zinc-200"}`}>
                  <input type="radio" name="photoRelease" value="AGREED" checked={photoRelease === "AGREED"} onChange={e => setPhotoRelease(e.target.value)} />
                  I AGREE to the use of photographs/videos of my child.
                </label>
                <label className={`flex items-center gap-2 text-sm p-2 rounded-lg border cursor-pointer ${photoRelease === "NOT_AGREED" ? "border-blue-500 bg-blue-50" : "border-zinc-200"}`}>
                  <input type="radio" name="photoRelease" value="NOT_AGREED" checked={photoRelease === "NOT_AGREED"} onChange={e => setPhotoRelease(e.target.value)} />
                  I DO NOT AGREE to the use of photographs/videos of my child.
                </label>
              </div>
            </div>
          )}

          {/* Payment notice */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <h2 className="text-lg font-bold text-zinc-900 mb-2">Payment</h2>
            <p className="text-sm text-zinc-600">An invoice will be sent to you via email prior to the cycle starting. You can pay online via credit card through the invoice link.</p>
            <p className="text-xs text-zinc-400 mt-2">Do NOT pay until you have received registration confirmation and your invoice.</p>
          </div>

          {/* Total summary - always visible */}
          <div className="bg-white rounded-xl border-2 border-zinc-300 p-6 sticky bottom-4 shadow-lg">
            <div className="space-y-1 text-sm mb-3">
              {selectedDays.length > 0 ? (
                <>
                  <div className="flex justify-between text-zinc-600">
                    <span>Subtotal ({sessionsCount} sessions)</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount{matchedDiscount ? ` (${matchedDiscount.code})` : ""}</span>
                      <span>-${totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {preregDiscount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Pre-registration discount</span>
                      <span>-${preregDiscount.toFixed(2)}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-zinc-400 text-center">Select at least one day to see pricing</p>
              )}
              <div className="flex justify-between font-bold text-lg text-zinc-900 pt-2 border-t border-zinc-200">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50">
            {submitting ? "Submitting..." : "Submit Registration"}
          </button>
        </form>
      </div>
    </div>
  )
}
