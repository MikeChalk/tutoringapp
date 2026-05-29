import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"

export default async function UploadPage(props: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await props.params
  const { done } = await props.searchParams

  const tutor = await prisma.tutor.findUnique({
    where: { cvToken: token },
    include: { user: { select: { name: true } } },
  })

  if (!tutor) notFound()

  if (done === "1") {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-white rounded-xl border border-zinc-200 p-8 text-center">
          <div className="text-4xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Documents Uploaded!</h1>
          <p className="text-zinc-600">Thank you, {tutor.user.name}. We've received your documents and will review them shortly.</p>
          <p className="text-sm text-zinc-500 mt-4">We'll reach out when a matching client is available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-8">
      <div className="max-w-lg w-full bg-white rounded-xl border border-zinc-200 p-8">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Upload Your Documents</h1>
        <p className="text-zinc-600 mb-6">Hi {tutor.user.name}! Please upload your CV and transcript below to complete your application.</p>

        <form action={`/api/upload/${token}`} method="POST" encType="multipart/form-data" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">CV / Resume (PDF)</label>
            <input type="file" name="cv" accept=".pdf,.doc,.docx" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Transcript (PDF)</label>
            <input type="file" name="transcript" accept=".pdf,.doc,.docx,.png,.jpg" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-sm" />
          </div>

          <button type="submit" className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition-opacity">
            Upload Documents
          </button>
        </form>

        <p className="text-xs text-zinc-400 mt-4 text-center">Accepted formats: PDF, DOC, DOCX, PNG, JPG (max 10MB each)</p>
      </div>
    </div>
  )
}
