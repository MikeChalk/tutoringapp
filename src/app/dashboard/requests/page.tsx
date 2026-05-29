"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { StatusBadge } from "@/components/ui"

const STATUS_FILTERS = [
  { value: "NEW", label: "New" },
  { value: "MATCHED", label: "Matched" },
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
    fetch(`/api/requests/waitlist${cityFilter !== "all" ? `?city=${cityFilter}` : ""}`)
      .then((r) => r.json())
      .then(setTutors)
  }, [filter, cityFilter])

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
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Tutoring Requests</h2>
        <div className="flex gap-2">
          {session?.user?.role === "ADMIN" && (
            <select
              value={cityFilter}
              onChange={(e) => {
                const v = e.target.value
                setCityFilter(v)
                const u = new URL(window.location.href)
                if (v === "all") u.searchParams.delete("city")
                else u.searchParams.set("city", v)
                window.history.replaceState(null, "", u.toString())
              }}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Cities</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
              showArchived ? "bg-zinc-200 dark:bg-zinc-600 text-zinc-800 dark:text-zinc-200" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            }`}
          >
            {showArchived ? "Active" : "Archive"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setFilter(f.value); setShowArchived(false) }}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
              filter === f.value && !showArchived
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Requests List */}
        <div>
          {filteredRequests.map((req) => (
            <button
              key={req.id}
              onClick={() => getRecommendations(req.id)}
              className={`w-full text-left border rounded-lg p-4 mb-3 transition-colors ${
                selected === req.id
                  ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-400"
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{req.name}</p>
                  <p className="text-sm text-zinc-500">{req.email}</p>
                </div>
                <StatusBadge status={req.status} />
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <strong>Subject:</strong> {req.subject}
              </p>
              {req.description && (
                <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{req.description}</p>
              )}
              {req.matchedTutor && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Matched: {req.matchedTutor.user.name}
                </p>
              )}
              <p className="text-xs text-zinc-400 mt-2">
                {new Date(req.createdAt).toLocaleDateString()}
              </p>
            </button>
          ))}
          {filteredRequests.length === 0 && (
            <p className="text-sm text-zinc-500 py-8 text-center">No requests found.</p>
          )}
        </div>

        {/* Right: Tutor Waitlist & Recommendations */}
        <div>
          {selectedRequest ? (
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                {loading ? "Analyzing..." : "AI Recommendations"}
              </h3>
              <p className="text-sm text-zinc-500 mb-4">
                Best tutor matches for: <strong>{selectedRequest.name}</strong> — {selectedRequest.subject}
              </p>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-zinc-100 dark:bg-zinc-700 rounded-lg h-16" />
                  ))}
                </div>
              ) : recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.map((rec, i) => {
                    const tutor = tutors.find((t) => t.user.name === rec.name)
                    return (
                      <div key={i} className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{rec.name}</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            rec.score >= 80 ? "bg-green-100 text-green-700" : rec.score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                          }`}>
                            {rec.score}%
                          </span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{rec.reason}</p>
                        {tutor && (
                          <p className="text-xs text-zinc-400 mt-1">
                            {tutor.tenure.replace("_", " ")} &middot; {tutor.subjects || "General"}
                          </p>
                        )}
                        {tutor && !tutor.onboarded && (
                          <button
                            onClick={() => matchTutor(selectedRequest.id, rec.name)}
                            className="mt-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 transition-colors"
                          >
                            Match & Send Offer
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Select a request to see AI recommendations.</p>
              )}

              <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                  Waitlist ({tutors.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {tutors.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-sm py-1">
                      <div>
                        <span className="text-zinc-900 dark:text-zinc-100">{t.user.name}</span>
                        <span className="text-xs text-zinc-400 ml-2">{t.tenure.replace("_", " ")}</span>
                      </div>
                      <button
                        onClick={() => matchTutor(selectedRequest.id, t.user.name)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Match
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 text-center">
              <p className="text-zinc-500 dark:text-zinc-400">Select a request from the left to see AI-matched tutors.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse bg-zinc-100 dark:bg-zinc-700 rounded-lg h-96" />}>
      <RequestsContent />
    </Suspense>
  )
}
