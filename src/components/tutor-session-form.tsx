"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { GRADE_LABELS, PRIVATE_TUTORING_CATEGORIES, PROGRAM_SUPERVISOR_CATEGORIES } from "@/lib/constants"
import type { Prisma } from "@prisma/client"

type ProjectWithTutors = Prisma.ProjectGetPayload<{
  include: {
    client: { select: { user: { select: { name: true } }; type: true } }
    projectTutors: { include: { tutor: { include: { user: { select: { name: true, id: true } } } } } }
  }
}>

interface TutorSessionFormProps {
  projects: ProjectWithTutors[]
  tutorId: string
  contractRates: Record<string, number>
  payScaleMap: Record<string, number>
  defaultProjectType: string
  onSessionLogged?: (totals: { totalPaid: number; totalUnpaid: number }) => void
}

function getContractRate(ratesObj: Record<string, number> | undefined, category: string, mode: string): number | undefined {
  if (!ratesObj || !category) return undefined
  const key = category + "|" + mode
  if (ratesObj[key] !== undefined) return ratesObj[key]
  return ratesObj[category]
}

function getPayScaleRate(payScaleMap: Record<string, number>, category: string, mode: string, projectType: string): number | undefined {
  const fullKey = projectType === "STUDY_HALL"
    ? `${category}|${mode}|${projectType}`
    : `${category}|${mode}`
  if (payScaleMap[fullKey] !== undefined) return payScaleMap[fullKey]
  if (payScaleMap[category] !== undefined) return payScaleMap[category]
  return undefined
}

export default function TutorSessionForm({
  projects,
  tutorId,
  contractRates,
  payScaleMap,
  defaultProjectType,
  onSessionLogged,
}: TutorSessionFormProps) {
  const [projectType, setProjectType] = useState(defaultProjectType)
  const [projectId, setProjectId] = useState("")
  const [mode, setMode] = useState("IN_PERSON")
  const [category, setCategory] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [hours, setHours] = useState("1")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [rate, setRate] = useState<number | null>(null)
  const initializedRef = useRef(false)

  const getCategories = useCallback(() => {
    return projectType === "STUDY_HALL" ? PROGRAM_SUPERVISOR_CATEGORIES : PRIVATE_TUTORING_CATEGORIES
  }, [projectType])

  const visibleProjects = projects.filter((p) => {
    if (projectType && (p.projectType || "STUDENT") !== projectType) return false
    return true
  })

  const selectedProject = projects.find((p) => p.id === projectId)

  const computeRate = useCallback((): number | null => {
    const lookupGrade = category || selectedProject?.gradeLevel
    const projType = selectedProject?.projectType || "STUDENT"
    if (!lookupGrade || !mode) return null

    const contractVal = getContractRate(contractRates, lookupGrade, mode)
    if (contractVal !== undefined) return contractVal

    const scaleVal = getPayScaleRate(payScaleMap, lookupGrade, mode, projType)
    if (scaleVal !== undefined) return scaleVal

    return null
  }, [category, selectedProject, mode, contractRates, payScaleMap])

  useEffect(() => {
    setRate(computeRate())
  }, [computeRate])

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      if (visibleProjects.length > 0 && !projectId) {
        const first = visibleProjects[0]
        setProjectId(first.id)
        const grade = first.gradeLevel
        const cats = (first.projectType || "STUDENT") === "STUDY_HALL" ? PROGRAM_SUPERVISOR_CATEGORIES : PRIVATE_TUTORING_CATEGORIES
        if (cats.includes(grade)) {
          setCategory(grade)
        } else if ((first.projectType || "STUDENT") === "STUDY_HALL") {
          setCategory("STUDY_HALL_TUTOR")
        }
      }
    }
  }, [])

  const handleTypeChange = (newType: string) => {
    setProjectType(newType)
    setProjectId("")
    setCategory("")
  }

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId)
    if (newProjectId) {
      const proj = projects.find((p) => p.id === newProjectId)
      if (proj) {
        const grade = proj.gradeLevel
        const cats = (proj.projectType || "STUDENT") === "STUDY_HALL" ? PROGRAM_SUPERVISOR_CATEGORIES : PRIVATE_TUTORING_CATEGORIES
        if (cats.includes(grade)) {
          setCategory(grade)
        } else if ((proj.projectType || "STUDENT") === "STUDY_HALL") {
          setCategory("STUDY_HALL_TUTOR")
        }
      }
    }
  }

  const canSubmit = projectId && date && hours && parseFloat(hours) > 0 && rate !== null && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError("")

    const formData = new FormData()
    formData.set("tutorId", tutorId)
    formData.set("projectId", projectId)
    formData.set("date", date)
    formData.set("hours", hours)
    formData.set("mode", mode)
    formData.set("category", category)
    formData.set("returnTo", "/dashboard")

    try {
      const res = await fetch("/api/hours", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to log session")
        setSubmitting(false)
        return
      }

      setSuccess(true)
      setHours("1")
      setTimeout(() => setSuccess(false), 2000)

      if (onSessionLogged && data.totalPaid !== undefined && data.totalUnpaid !== undefined) {
        onSessionLogged({ totalPaid: data.totalPaid, totalUnpaid: data.totalUnpaid })
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="tutorId" value={tutorId} />
      <input type="hidden" name="category" value={category} />
      {projectType === "STUDY_HALL" && <input type="hidden" name="mode" value="IN_PERSON" />}

      {success && (
        <div className="bg-[#ecfdf5] text-[#047857] text-sm rounded-lg px-4 py-2 text-center font-medium">
          Session saved ✓
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {rate !== null && (
        <div className="flex justify-end -mt-1 mb-1">
          <span className="inline-flex items-center rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]">
            ${rate}/hr
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#5B7B9A] mb-1">Project Type</label>
          <select
            value={projectType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full rounded-lg border border-[#e3e7eb] bg-white px-3 py-2.5 text-sm text-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
          >
            <option value="STUDENT">Private Tutoring</option>
            <option value="STUDY_HALL">Other Projects</option>
          </select>
        </div>
        {projectType !== "STUDY_HALL" && (
          <div>
            <label className="block text-xs font-medium text-[#5B7B9A] mb-1">Mode</label>
            <select
              name="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full rounded-lg border border-[#e3e7eb] bg-white px-3 py-2.5 text-sm text-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
            >
              <option value="IN_PERSON">In Person</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
        )}
        {projectType === "STUDY_HALL" && (
          <div>
            <label className="block text-xs font-medium text-[#5B7B9A] mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-[#e3e7eb] bg-white px-3 py-2.5 text-sm text-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
            >
              <option value="">Select</option>
              {getCategories().map((cat) => (
                <option key={cat} value={cat}>{GRADE_LABELS[cat] || cat}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-[#5B7B9A] mb-1">Project</label>
        <select
          value={projectId}
          onChange={(e) => handleProjectChange(e.target.value)}
          className="w-full rounded-lg border border-[#e3e7eb] bg-white px-3 py-2.5 text-sm text-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
        >
          <option value="">Select project</option>
          {visibleProjects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-[#5B7B9A] mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-[#e3e7eb] bg-white px-3 py-2.5 text-sm text-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#5B7B9A] mb-1">Hours</label>
          <input
            type="number"
            min="0.25"
            step="0.25"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="w-full rounded-lg border border-[#e3e7eb] bg-white px-3 py-2.5 text-sm text-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
          />
        </div>
        <div className="col-span-2 sm:col-span-1 flex items-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-[#1E3A5F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#16304f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving…" : "Log it"}
          </button>
        </div>
      </div>

      {projectId && rate === null && (
        <p className="text-xs text-amber-600">
          No rate found for this project/category/mode combination. Contact your administrator.
        </p>
      )}
    </form>
  )
}