"use client"

import { useState } from "react"
import TutorSessionForm from "@/components/tutor-session-form"
import CountUpValue from "@/components/count-up-value"
import ScrollReveal from "@/components/scroll-reveal"
import Link from "next/link"
import { Users, FolderKanban, MailCheck, DollarSign, FileText, Settings } from "lucide-react"
import type { Prisma } from "@prisma/client"

type ProjectWithTutors = Prisma.ProjectGetPayload<{
  include: {
    client: { select: { user: { select: { name: true } }; type: true } }
    projectTutors: { include: { tutor: { include: { user: { select: { name: true, id: true } } } } } }
  }
}>

const NAV_TILES = [
  { href: "/dashboard/clients", label: "My Clients", icon: Users },
  { href: "/dashboard/projects", label: "My Projects", icon: FolderKanban },
  { href: "/dashboard/requests", label: "Tutoring Offers", icon: MailCheck },
  { href: "/dashboard/payments", label: "My Payments", icon: DollarSign },
  { href: "/dashboard/contract", label: "My Contract", icon: FileText },
  { href: "/dashboard/profile", label: "Settings", icon: Settings },
]

interface TutorDashboardContentProps {
  greeting: string
  subline: string
  projects: ProjectWithTutors[]
  tutorId: string
  contractRates: Record<string, number>
  payScaleMap: Record<string, number>
  defaultProjectType: string
  initialTotalPaid: number
  initialTotalUnpaid: number
  payoutDateStr: string
  contractSigned: boolean
  onboardingComplete: boolean
}

export default function TutorDashboardContent({
  greeting,
  subline,
  projects,
  tutorId,
  contractRates,
  payScaleMap,
  defaultProjectType,
  initialTotalPaid,
  initialTotalUnpaid,
  payoutDateStr,
  contractSigned,
  onboardingComplete,
}: TutorDashboardContentProps) {
  const [totalPaid, setTotalPaid] = useState(initialTotalPaid)
  const [totalUnpaid, setTotalUnpaid] = useState(initialTotalUnpaid)

  const needsSetup = !contractSigned || !onboardingComplete

  function handleSessionLogged(totals: { totalPaid: number; totalUnpaid: number }) {
    setTotalPaid(totals.totalPaid)
    setTotalUnpaid(totals.totalUnpaid)
  }

  return (
    <div className="font-[family-name:var(--font-inter)] -m-4 lg:-m-8 min-h-screen bg-[#F4F6F8]">
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-5">

        <ScrollReveal delay={0}>
          <div>
            <h1 className="text-3xl font-bold text-[#1E3A5F]">{greeting}</h1>
            <p className="text-sm text-[#5B7B9A] mt-1">{subline}</p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0}>
          <div className="bg-white rounded-xl border border-[#e3e7eb] p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-[#1E3A5F]">Log a session</h2>
            </div>
            <TutorSessionForm
              projects={projects}
              tutorId={tutorId}
              contractRates={contractRates}
              payScaleMap={payScaleMap}
              defaultProjectType={defaultProjectType}
              onSessionLogged={handleSessionLogged}
            />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-[#e3e7eb] p-5">
              <p className="text-xs font-medium text-[#5B7B9A] uppercase tracking-wide mb-1">Paid</p>
              <p className="text-2xl font-bold text-[#1E3A5F]">
                <CountUpValue target={totalPaid} />
              </p>
            </div>
            <div className="bg-[#ecfdf5] rounded-xl border border-[#d1fae5] p-5">
              <p className="text-xs font-medium text-[#047857] uppercase tracking-wide mb-1">Coming to you</p>
              <p className="text-2xl font-bold text-[#047857]">
                <CountUpValue target={totalUnpaid} />
              </p>
              {totalUnpaid > 0 && (
              <p className="text-xs text-[#047857]/70 mt-1">
                Arrives {payoutDateStr}
              </p>
              )}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {NAV_TILES.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="bg-white rounded-xl border border-[#e3e7eb] p-4 flex flex-col items-center gap-2 hover:border-[#1E3A5F]/30 transition-colors"
              >
                <Icon className="w-5 h-5 text-[#1E3A5F]" />
                <span className="text-sm font-medium text-[#1E3A5F]">{label}</span>
              </Link>
            ))}
          </div>
        </ScrollReveal>

        {needsSetup && (
          <ScrollReveal delay={0.3}>
            <div className="bg-[#1E3A5F] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between">
              <p className="text-sm font-medium text-white">
                Finish setup
                {!contractSigned && " — sign contract"}
                {!contractSigned && !onboardingComplete ? " ·" : ""}
                {!onboardingComplete && " complete onboarding"}
              </p>
              <Link
                href={!contractSigned ? "/dashboard/contract" : "/dashboard/onboarding"}
                className="sm:ml-3 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30 transition-colors whitespace-nowrap text-center"
              >
                {!contractSigned ? "Sign Contract" : "Onboarding"}
              </Link>
            </div>
          </ScrollReveal>
        )}

      </div>
    </div>
  )
}