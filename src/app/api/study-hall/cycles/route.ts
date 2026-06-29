import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin, getCityAccessScope, assertInScope } from "@/lib/auth-helpers"
import { STUDY_HALL_BILLING_MODELS, DEFAULT_STUDY_HALL_TERMS, DEFAULT_PHOTO_RELEASE_TEXT, DEFAULT_STUDY_HALL_INTRO, STUDY_HALL_GRADE_OPTIONS } from "@/lib/constants"

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const scope = await getCityAccessScope(session.user.role, session.user.id)
  if (scope.kind === "none") return NextResponse.json({ error: "No city access" }, { status: 403 })

  const formData = await request.formData()
  const action = formData.get("_action") as string

  if (action === "create") {
    const name = (formData.get("name") as string)?.trim()
    const schoolClientId = formData.get("schoolClientId") as string
    const projectId = (formData.get("projectId") as string) || null
    const billingModel = formData.get("billingModel") as string
    const startDate = formData.get("startDate") as string
    const endDate = formData.get("endDate") as string
    const pricePerSession = parseFloat((formData.get("pricePerSession") as string) || "0")
    const formCityId = (formData.get("cityId") as string) || null

    if (!name || !schoolClientId || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!STUDY_HALL_BILLING_MODELS.includes(billingModel as typeof STUDY_HALL_BILLING_MODELS[number])) {
      return NextResponse.json({ error: "Invalid billing model" }, { status: 400 })
    }

    const schoolClient = await prisma.client.findUnique({
      where: { id: schoolClientId },
      select: { user: { select: { cityId: true } } },
    })
    if (!schoolClient) return NextResponse.json({ error: "School client not found" }, { status: 404 })

    const scopeError = assertInScope(schoolClient.user.cityId, scope)
    if (scopeError) return scopeError

    const cityId = scope.kind === "single" ? scope.cityId : formCityId

    let slug = slugify(name)
    let slugSuffix = 0
    while (await prisma.studyHallCycle.findUnique({ where: { slug } })) {
      slugSuffix++
      slug = slugify(`${name}-${slugSuffix}`)
    }

    const defaultFormConfig = {
      showLanguage: true,
      showChildNotes: true,
      showReferral: true,
      showDiscountCode: true,
      showTerms: true,
      showSignature: true,
      showPhotoRelease: true,
    }

    const cycle = await prisma.studyHallCycle.create({
      data: {
        name,
        slug,
        schoolClientId,
        projectId: projectId || null,
        billingModel,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        pricePerSession,
        cityId,
        formConfig: JSON.stringify(defaultFormConfig),
        introText: DEFAULT_STUDY_HALL_INTRO,
        termsText: DEFAULT_STUDY_HALL_TERMS,
        photoReleaseText: DEFAULT_PHOTO_RELEASE_TEXT,
        gradeOptions: JSON.stringify([...STUDY_HALL_GRADE_OPTIONS]),
        status: "DRAFT",
      },
    })

    return NextResponse.redirect(new URL(`/dashboard/study-hall/${cycle.id}`, request.url), 303)
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
