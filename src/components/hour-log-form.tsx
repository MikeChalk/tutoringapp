"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { GRADE_LABELS, PRIVATE_TUTORING_CATEGORIES, PROGRAM_SUPERVISOR_CATEGORIES, TENURE_LABELS } from "@/lib/constants"
import type { Prisma } from "@prisma/client"

type ProjectWithTutors = Prisma.ProjectGetPayload<{
  include: {
    client: { select: { user: { select: { name: true } }; type: true } }
    projectTutors: { include: { tutor: { include: { user: { select: { name: true; id: true } } } } } }
  }
}>

type TutorWithUser = Prisma.TutorGetPayload<{ include: { user: { select: { name: true } } } }>

interface HourLogFormProps {
  projects: ProjectWithTutors[]
  tutors: TutorWithUser[]
  defaultTutorId: string | null
  isTutor: boolean
  adminTutorId: string | null
  tutorProjectsMap: Record<string, string[]>
  billingRates: Record<string, number>
  tutorContracts: Record<string, Record<string, number>>
  contractRates: Record<string, number>
}

function getContractRate(ratesObj: Record<string, number> | undefined, category: string, mode: string): number | undefined {
  if (!ratesObj || !category) return undefined
  const key = category + "|" + mode
  if (ratesObj[key] !== undefined) return ratesObj[key]
  return ratesObj[category]
}

export default function HourLogForm({
  projects,
  tutors,
  defaultTutorId,
  isTutor,
  adminTutorId,
  tutorProjectsMap,
  billingRates,
  tutorContracts,
  contractRates,
}: HourLogFormProps) {
  const [tutorId, setTutorId] = useState(defaultTutorId || "")
  const [projectType, setProjectType] = useState("STUDENT")
  const [projectId, setProjectId] = useState("")
  const [mode, setMode] = useState("IN_PERSON")
  const [category, setCategory] = useState("")
  const [billingRate, setBillingRate] = useState("")
  const [tutorPayRate, setTutorPayRate] = useState("")
  const [categoryManual, setCategoryManual] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const initializedRef = useRef(false)

  const getCategories = useCallback(() => {
    return projectType === "STUDY_HALL" ? PROGRAM_SUPERVISOR_CATEGORIES : PRIVATE_TUTORING_CATEGORIES
  }, [projectType])

  const filteredProjects = useCallback(() => {
    const isAdminTutor = adminTutorId && tutorId === adminTutorId
    const assigned = tutorId && !isAdminTutor ? (tutorProjectsMap[tutorId] || []) : null
    return projects.filter((p) => {
      if (projectType && (p.projectType || "STUDENT") !== projectType) return false
      if (assigned && !assigned.includes(p.id)) return false
      return true
    })
  }, [projects, projectType, tutorId, adminTutorId, tutorProjectsMap])

  const visibleProjects = filteredProjects()

  const suggestRates = useCallback(() => {
    const proj = visibleProjects.find(p => p.id === projectId)
    const lookupGrade = category || proj?.gradeLevel
    const projType = proj?.projectType || "STUDENT"

    if (!isTutor && lookupGrade && mode && projType) {
      const brKey = lookupGrade + "|" + mode + "|" + projType
      const br = billingRates[brKey]
      if (br !== undefined) {
        setBillingRate(br.toString())
      }
    }

    if (tutorId && tutorContracts[tutorId] && projectId) {
      const cr = getContractRate(tutorContracts[tutorId], lookupGrade || "", mode)
      if (cr !== undefined && !isTutor) {
        setTutorPayRate(cr.toString())
      }
    }
  }, [projectId, visibleProjects, category, mode, isTutor, billingRates, tutorId, tutorContracts])

  const autoSelectCategory = useCallback((projId: string) => {
    if (!projId) return
    const proj = projects.find(p => p.id === projId)
    if (!proj) return
    const grade = proj.gradeLevel
    const cats = getCategories()
    if (cats.includes(grade)) {
      setCategory(grade)
    } else if ((proj.projectType || "STUDENT") === "STUDY_HALL") {
      setCategory("STUDY_HALL_TUTOR")
    } else {
      setCategory("")
    }
  }, [projects, getCategories])

  const handleTutorChange = useCallback((newTutorId: string) => {
    setTutorId(newTutorId)
    setCategoryManual(false)
    setCategory("")
    setBillingRate("")
    setTutorPayRate("")
    setProjectId("")
  }, [])

  const handleProjectChange = useCallback((newProjectId: string) => {
    setProjectId(newProjectId)
    setCategoryManual(false)
    if (newProjectId) {
      autoSelectCategory(newProjectId)
    }
  }, [autoSelectCategory])

  const handleCategoryChange = useCallback((newCategory: string) => {
    setCategory(newCategory)
    setCategoryManual(true)
  }, [])

  useEffect(() => {
    if (initializedRef.current) {
      setCategoryManual(false)
      setProjectId("")
    }
  }, [projectType])

  useEffect(() => {
    if (!initialized) return
    suggestRates()
  }, [category, projectId, mode, suggestRates, initialized])

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      if (visibleProjects.length > 0 && !projectId) {
        const first = visibleProjects[0]
        setProjectId(first.id)
        autoSelectCategory(first.id)
      }
      setInitialized(true)
    } else if (visibleProjects.length > 0 && (!projectId || !visibleProjects.some(p => p.id === projectId))) {
      const first = visibleProjects[0]
      setProjectId(first.id)
      if (!categoryManual) autoSelectCategory(first.id)
    } else if (visibleProjects.length === 0) {
      setProjectId("")
    }
  }, [projectId, visibleProjects, initialized, autoSelectCategory, categoryManual])

  const handleTypeChange = useCallback((newType: string) => {
    setProjectType(newType)
    setCategoryManual(false)
    setCategory("")
    setProjectId("")
  }, [])

  const payRateDisplay = isTutor && category
    ? (() => {
        const cr = getContractRate(contractRates, category, mode)
        return cr !== undefined ? "$" + cr + "/hr" : "--"
      })()
    : null

  return (
    <form action="/api/hours" method="POST" className="flex flex-col gap-4" id="hourLogForm">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Team Member</label>
        <select name="tutorId" required value={tutorId} onChange={(e) => handleTutorChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="" disabled={!!defaultTutorId}>Select tutor</option>
          {tutors.map((t) => (
            <option key={t.id} value={t.id}>{t.user.name} ({TENURE_LABELS[t.tenure] || t.tenure})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Project Type</label>
        <select value={projectType} onChange={(e) => handleTypeChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="STUDENT">Private Tutoring</option>
          <option value="STUDY_HALL">Other Projects</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Project</label>
        <select name="projectId" required value={projectId} onChange={(e) => handleProjectChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Select project</option>
          {projects.map((p) => {
            const isVisible = visibleProjects.some(vp => vp.id === p.id)
            if (!isVisible) return null
            return (
              <option key={p.id} value={p.id}>{p.name}</option>
            )
          })}
        </select>
      </div>
      {projectType !== "STUDY_HALL" && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Mode</label>
          <select name="mode" required value={mode} onChange={(e) => setMode(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="IN_PERSON">In Person</option>
            <option value="ONLINE">Online</option>
          </select>
        </div>
      )}
      {projectType === "STUDY_HALL" ? (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Category</label>
          <select name="category" value={category} onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">--</option>
            {getCategories().map((cat) => (
              <option key={cat} value={cat}>{GRADE_LABELS[cat] || cat}</option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="category" value={category} />
      )}
      {projectType === "STUDY_HALL" && <input type="hidden" name="mode" value="IN_PERSON" />}
      <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 border border-zinc-200 dark:border-zinc-700">
        {!isTutor ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Billing Rate ($/hr)</label>
                <input type="number" name="billingRate" min="0" step="0.01" value={billingRate} onChange={(e) => setBillingRate(e.target.value)}
                  className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tutor Pay Rate ($/hr)</label>
                <input type="number" name="tutorPayRate" min="0" step="0.01" value={tutorPayRate} onChange={(e) => setTutorPayRate(e.target.value)}
                  className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <p className="text-xs text-zinc-400">Leave blank to auto-calculate from rate tables.</p>
          </>
        ) : (
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Your Pay Rate:</span>
            <span className="font-medium text-green-600 dark:text-green-400">{payRateDisplay}</span>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Date</label>
        <input type="date" name="date" required defaultValue={new Date().toISOString().split("T")[0]}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Hours</label>
        <input type="number" name="hours" required min="0.25" step="0.25" defaultValue="1"
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      {!isTutor && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
          <textarea name="description" rows={2}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}
      <button type="submit"
        className="w-full rounded-lg bg-zinc-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:opacity-90 transition-opacity">
        Log Hours
      </button>
    </form>
  )
}
