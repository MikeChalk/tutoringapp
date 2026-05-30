"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { StatusBadge } from "@/components/ui"

const ADMIN_STATUS_FILTERS = [
  { value: "NEW", label: "New" },
  { value: "MATCHED", label: "Matched" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
]

const TUTOR_STATUS_FILTERS = [
  { value: "NEW", label: "Offers" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
]

interface Request {
  id: string; name: string; email: string; phone?: string | null
  subject: string; description?: string | null; preferredSchedule?: string | null
  status: string; createdAt: string
  matchedTutor?: { id: string; user: { name: string } } | null
}

interface Tutor {
  id: string; tenure: string; subjects: string; bio?: string | null
  user: { name: string; email: string }
  onboarded: boolean
}

interface Recommendation {
  name: string; score: number; reason: string
}

function RequestsContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [requests, setRequests] = useState<Request[]>([])
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [filter, setFilter] = useState("NEW")
  const [selected, setSelected] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [cityFilter, setCityFilter] = useState(searchParams.get("city") || "all")
  const [cities, setCities] = useState<{ id: string; name: string }[]>([])
  const isAdmin = session?.user?.role === "ADMIN"
  const isTutorRole = session?.user?.role === "TUTOR"

  const STATUS_FILTERS = isTutorRole ? TUTOR_STATUS_FILTERS : ADMIN_STATUS_FILTERS

  useEffect(() => {
    fetch("/api/city").then(r => r.json()).then(d => setCities(d.cities || []))
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    const cityParam = cityFilter !== "all" ? `&city=${cityFilter}` : ""
    fetch(`/api/requests/list?status=${filter}${cityParam}`)
      .then((r) => r.json())
      .then(setRequests)
    if (isAdmin) {
      fetch(`/api/requests/waitlist${cityFilter !== "all" ? `?city=${cityFilter}` : ""}`)
        .then((r) => r.json())
        .then(setTutors)
    }
  }, [filter, cityFilter, isAdmin])

  async function getRecommendations(requestId: string) {
    setSelected(requestId)
    setLoading(true)
    const res = await fetch("/api/requests/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    })
    const data = await res.json()
    setRecommendations(data.recommendations || [])
    setLoading(false)
  }

  async function matchTutor(requestId: string, tutorName: string) {
    const tutor = tutors.find((t) => t.user.name === tutorName)
    if (!tutor) return
    const formData = new FormData()
    formData.set("requestId", requestId)
    formData.set("matchedTutorId", tutor.id)
    await fetch("/api/requests/match", {
      method: "PATCH",
      body: formData,
    })
    setFilter("MATCHED")
    setSelected(null)
    setRecommendations([])
  }

  const filteredRequests = showArchived
    ? requests.filter((r) => r.status === "COMPLETED" || r.status === "CANCELLED")
    : requests

  const selectedRequest = requests.find((r) => r.id === selected)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {isTutorRole ? "Tutoring Offers" : "Tutoring Requests"}
        </h2>
        <div className="flex gap-2">
          {session?.user?.role === "ADMIN" && (
            <select value={cityFilter} onChange={(e) => { setCityFilter(e.target.value); router.push(`/dashboard/requests?city=${e.target.value}`) }}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Cities</option>
              {cities.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          )}
          {isAdmin && (
            <button onClick={() => setShowArchived(!showArchived)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">
              {showArchived ? "Active" : "Archive"}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setShowArchived(false) }}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              filter === f.value
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          {filteredRequests.length === 0 && (
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
              <p className="text-sm text-zinc-500">No requests found.</p>
            </div>
          )}
          {filteredRequests.map((req) => (
            <button
              key={req.id}
              onClick={() => isAdmin ? getRecommendations(req.id) : setSelected(req.id)}
              className={`text-left bg-white dark:bg-zinc-800 rounded-xl border p-4 transition-colors hover:border-zinc-400 dark:hover:border-zinc-500 ${
                selected === req.id ? "border-blue-500 dark:border-blue-400 ring-1 ring-blue-500" : "border-zinc-200 dark:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{req.name}</p>
                  <p className="text-xs text-zinc-500">{req.email}{req.phone ? ` · ${req.phone}` : ""}</p>
                </div>
                <StatusBadge status={req.status} />
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-1">{req.subject}</p>
              {req.description && (
                <p className="text-xs text-zinc-500 line-clamp-2">{req.description}</p>
              )}
              {req.matchedTutor && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  Matched with: {req.matchedTutor.user.name}
                </p>
              )}
              {isAdmin && req.status === "MATCHED" && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  <a href="/dashboard/onboarding" className="hover:underline">Start Onboarding →</a>
                </p>
              )}
              {isTutorRole && req.status === "NEW" && (
                <div className="flex gap-2 mt-3">
                  <form action={`/api/requests/${req.id}/accept`} method="POST">
                    <button type="submit" className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700">Accept</button>
                  </form>
                  <form action={`/api/requests/${req.id}/reject`} method="POST">
                    <button type="submit" className="text-xs px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700">Reject</button>
                  </form>
                </div>
              )}
              <p className="text-xs text-zinc-400 mt-2">{new Date(req.createdAt).toLocaleDateString()}</p>
            </button>
          ))}
        </div>

        {isAdmin && (
          <div>
            {selectedRequest ? (
              <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">AI Recommendations</h3>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse bg-zinc-100 dark:bg-zinc-700 h-16 rounded-lg" />
                    ))}
                  </div>
                ) : recommendations.length === 0 ? (
                  <p className="text-sm text-zinc-500">No recommendations available.</p>
                ) : (
                  <div className="space-y-3">
                    {recommendations.map((rec) => (
                      <div key={rec.name} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{rec.name}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            rec.score >= 80 ? "bg-green-100 text-green-700" : rec.score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                          }`}>
                            {rec.score}%
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mb-2">{rec.reason}</p>
                        <button
                          type="button"
                          onClick={() => matchTutor(selectedRequest.id, rec.name)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Match &amp; Send Offer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <p className="text-xs text-zinc-500 mb-2">Waitlist ({tutors.length})</p>
                  <div className="space-y-1">
                    {tutors.slice(0, 10).map((t) => (
                      <p key={t.id} className="text-xs text-zinc-600 dark:text-zinc-400">
                        {t.user.name} — {t.subjects || "General"}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
                <p className="text-sm text-zinc-500">Select a request from the left to see AI-matched tutors.</p>
              </div>
            )}
          </div>
        )}

        {isTutorRole && selected && (
          <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Request Details</h3>
            {(() => {
              const req = requests.find(r => r.id === selected)
              if (!req) return <p className="text-sm text-zinc-500">Not found.</p>
              return (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-zinc-500">Parent</p>
                    <p className="text-zinc-900 dark:text-zinc-100">{req.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Contact</p>
                    <p className="text-zinc-600 dark:text-zinc-400">{req.email}{req.phone ? ` · ${req.phone}` : ""}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Subject</p>
                    <p className="text-zinc-900 dark:text-zinc-100">{req.subject}</p>
                  </div>
                  {req.description && (
                    <div>
                      <p className="text-xs text-zinc-500">Details</p>
                      <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{req.description}</p>
                    </div>
                  )}
                  {req.preferredSchedule && (
                    <div>
                      <p className="text-xs text-zinc-500">Schedule</p>
                      <p className="text-zinc-600 dark:text-zinc-400">{req.preferredSchedule}</p>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Loading...</div>}>
      <RequestsContent />
    </Suspense>
  )
}
