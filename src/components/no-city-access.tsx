export function NoCityAccess() {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 p-8 text-center">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">No city assigned to your account</p>
      <p className="text-sm text-zinc-500 mt-1">Contact a super admin to assign your city before you can view this page.</p>
    </div>
  )
}
