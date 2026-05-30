import { prisma } from "@/lib/db"
import { requireAuth, isAdmin } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"

const PLATFORM_LINKS = [
  { href: "/", label: "Homepage" },
  { href: "/careers", label: "Careers Application" },
  { href: "/dashboard", label: "Dashboard — Overview" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/tutors", label: "Team" },
  { href: "/dashboard/waitlist", label: "Tutor Waitlist" },
  { href: "/dashboard/onboarding", label: "Onboarding" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/discounts", label: "Discounts" },
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/hours", label: "Log Hours" },
  { href: "/dashboard/requests", label: "Tutoring Requests" },
  { href: "/dashboard/invoices", label: "Invoices" },
  { href: "/dashboard/payments-admin", label: "Payouts" },
  { href: "/dashboard/expenses", label: "Finance" },
  { href: "/dashboard/rates", label: "Rates & Cities" },
  { href: "/dashboard/contracts", label: "Contracts" },
  { href: "/dashboard/import", label: "Import" },
  { href: "/dashboard/email", label: "Mass Email" },
  { href: "/dashboard/workflows", label: "Workflows — Email Templates" },
  { href: "/dashboard/settings", label: "Settings" },
]

const TUTOR_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "My Profile" },
  { href: "/dashboard/clients", label: "My Clients" },
  { href: "/dashboard/projects", label: "My Students" },
  { href: "/dashboard/hours", label: "Log Hours" },
  { href: "/dashboard/requests", label: "Offers" },
  { href: "/dashboard/payments", label: "My Payments" },
  { href: "/dashboard/contract", label: "My Contract" },
]

const CLIENT_LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "My Profile" },
  { href: "/dashboard/projects", label: "My Students" },
  { href: "/dashboard/invoices", label: "Invoices" },
]

export default async function SettingsPage() {
  const session = await requireAuth()
  if (!isAdmin(session.user.role)) redirect("/dashboard")

  let settings = await prisma.companySettings.findUnique({ where: { id: "main" } })
  if (!settings) {
    settings = await prisma.companySettings.create({ data: { id: "main" } })
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Settings</h2>

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="block text-xs text-zinc-500 mb-1">Invoice Prefix</label><input type="text" name="invoicePrefix" defaultValue={settings.invoicePrefix} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-zinc-500 mb-1">Tax Number</label><input type="text" name="taxNumber" defaultValue={settings.taxNumber} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-zinc-500 mb-1">Default Footer Note</label><input type="text" name="invoiceNotes" defaultValue={settings.invoiceNotes} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Integrations</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Stripe Secret Key</label>
                <input type="text" name="stripeKey" defaultValue={process.env.STRIPE_SECRET_KEY || ""} placeholder="sk_live_..." className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">OpenAI API Key</label>
                <input type="text" name="openaiKey" defaultValue={settings.openaiKey || process.env.OPENAI_API_KEY || ""} placeholder="sk-..." className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Resend API Key</label>
                <input type="text" name="resendKey" defaultValue={process.env.RESEND_API_KEY || ""} placeholder="re_..." className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div><label className="block text-xs text-zinc-500 mb-1">Twilio Account SID</label><input type="text" name="twilioSid" defaultValue={settings.twilioSid} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs text-zinc-500 mb-1">Twilio Auth Token</label><input type="text" name="twilioToken" defaultValue={settings.twilioToken} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-xs text-zinc-500 mb-1">Twilio Phone Number</label><input type="text" name="twilioFrom" defaultValue={settings.twilioFrom} placeholder="+1234567890" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="stripeEnabled" defaultChecked={settings.stripeEnabled} className="rounded" /> Enable Stripe payments</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="smsEnabled" defaultChecked={settings.smsEnabled} className="rounded" /> Enable SMS alerts</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="openaiEnabled" defaultChecked={settings.openaiEnabled} className="rounded" /> Enable AI tutor matching</label>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Email Templates</h3>
          <div className="space-y-4">
            <div><label className="block text-xs text-zinc-500 mb-1">Welcome Email (sent to new tutors)</label><textarea name="welcomeEmailTemplate" rows={3} defaultValue="Welcome to J.A.S.S.! We're excited to have you on the team.\n\nPlease log in to the platform and sign your contract to get started." className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-zinc-500 mb-1">Client Invite Email</label><textarea name="clientInviteEmailTemplate" rows={3} defaultValue="You've been added as a client of J.A.S.S. Tutoring Services. Please complete your account setup to view and pay invoices." className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-xs text-zinc-500 mb-1">Payment Received Email</label><textarea name="paymentReceivedEmailTemplate" rows={3} defaultValue="Your payment has been received. Thank you for your business!" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Platform Links</h3>
          <p className="text-xs text-zinc-500 mb-3">Quick access to every page on the platform.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
            {PLATFORM_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline py-1"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-700/50">
            <p className="text-xs font-medium text-zinc-500 mb-2">Tutor Pages</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
              {TUTOR_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-xs text-blue-600 dark:text-blue-400 hover:underline py-1">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-700/50">
            <p className="text-xs font-medium text-zinc-500 mb-2">Client Pages</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
              {CLIENT_LINKS.map((link) => (
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
