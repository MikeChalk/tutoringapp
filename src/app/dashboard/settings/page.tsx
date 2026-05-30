import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getAdminFlatLinks, TUTOR_NAV_LINKS, CLIENT_NAV_LINKS, TOP_LEVEL_LINKS } from "@/lib/constants"

export default async function SettingsPage(props: { searchParams: Promise<{ saved?: string }> }) {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  const { saved } = await props.searchParams

  let settings = await prisma.companySettings.findUnique({ where: { id: "main" } })
  if (!settings) {
    settings = await prisma.companySettings.create({ data: { id: "main" } })
  }

  const adminLinks = getAdminFlatLinks()

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Settings</h2>

      {saved === "1" && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-3 text-sm text-green-700 dark:text-green-300">
          Settings saved successfully.
        </div>
      )}

      <form action="/api/settings" method="POST" className="space-y-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Company Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs text-zinc-500 mb-1">Company Name</label><input type="text" name="name" defaultValue={settings.name} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-zinc-500 mb-1">Email</label><input type="text" name="email" defaultValue={settings.email} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-zinc-500 mb-1">Phone</label><input type="text" name="phone" defaultValue={settings.phone} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-zinc-500 mb-1">Website</label><input type="text" name="website" defaultValue={settings.website} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
          <div className="mt-4"><label className="block text-xs text-zinc-500 mb-1">Address</label><input type="text" name="address" defaultValue={settings.address} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Invoice Defaults</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="block text-xs text-zinc-500 mb-1">Invoice Prefix</label><input type="text" name="invoicePrefix" defaultValue={settings.invoicePrefix} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-zinc-500 mb-1">Tax Number</label><input type="text" name="taxNumber" defaultValue={settings.taxNumber} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-zinc-500 mb-1">Default Tax Rate (%)</label><input type="number" name="defaultTaxRate" defaultValue={settings.defaultTaxRate} step="0.01" min="0" max="100" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-zinc-500 mb-1">Footer Note</label><input type="text" name="invoiceNotes" defaultValue={settings.invoiceNotes} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Integrations</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Stripe Secret Key</label>
                <input type="password" name="stripeKey" defaultValue={""} placeholder={process.env.STRIPE_SECRET_KEY ? "••••••••" : "sk_live_..."} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">OpenAI API Key</label>
                <input type="password" name="openaiKey" defaultValue={""} placeholder={settings.openaiKey || process.env.OPENAI_API_KEY ? "••••••••" : "sk-..."} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Resend API Key</label>
                <input type="password" name="resendKey" defaultValue={""} placeholder={process.env.RESEND_API_KEY ? "••••••••" : "re_..."} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div><label className="block text-xs text-zinc-500 mb-1">Twilio Account SID</label><input type="text" name="twilioSid" defaultValue={settings.twilioSid} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs text-zinc-500 mb-1">Twilio Auth Token</label><input type="password" name="twilioToken" defaultValue="" placeholder={settings.twilioToken ? "••••••••" : "Enter auth token"} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs text-zinc-500 mb-1">Twilio Phone Number</label><input type="text" name="twilioFrom" defaultValue={settings.twilioFrom} placeholder="+1234567890" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="stripeEnabled" defaultChecked={settings.stripeEnabled} className="rounded" /> Enable Stripe payments</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="smsEnabled" defaultChecked={settings.smsEnabled} className="rounded" /> Enable SMS alerts</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="openaiEnabled" defaultChecked={settings.openaiEnabled} className="rounded" /> Enable AI tutor matching</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="emailEnabled" defaultChecked={settings.emailEnabled} className="rounded" /> Enable outgoing emails</label>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Email Templates</h3>
          <p className="text-sm text-zinc-500 mb-3">
            Email templates are now managed in the{" "}
            <Link href="/dashboard/workflows" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              Workflows → Email Templates
            </Link>{" "}
            page, with a rich text editor, variable chips, and test-send capability.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Platform Links</h3>
          <p className="text-xs text-zinc-500 mb-3">Every page on the platform. Updated automatically when new pages are added.</p>

          <div className="mb-4">
            <p className="text-xs font-medium text-zinc-500 mb-2">Public Pages</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
              {TOP_LEVEL_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-xs text-blue-600 dark:text-blue-400 hover:underline py-1">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mb-4 pt-3 border-t border-zinc-100 dark:border-zinc-700/50">
            <p className="text-xs font-medium text-zinc-500 mb-2">Admin Pages</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
              {adminLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-xs text-blue-600 dark:text-blue-400 hover:underline py-1">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-700/50">
            <p className="text-xs font-medium text-zinc-500 mb-2">Tutor Pages</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
              {TUTOR_NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-xs text-blue-600 dark:text-blue-400 hover:underline py-1">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-700/50">
            <p className="text-xs font-medium text-zinc-500 mb-2">Client Pages</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
              {CLIENT_NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-xs text-blue-600 dark:text-blue-400 hover:underline py-1">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">Save All Settings</button>
      </form>
    </div>
  )
}
