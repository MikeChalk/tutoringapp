import { prisma } from "@/lib/db"
import Script from "next/script"

export async function CityFilter({ selected = "all", name = "city" }: { selected?: string; name?: string }) {
  const cities = await prisma.city.findMany({ select: { id: true, name: true } })
  const formId = `cityFilterForm-${name}`
  return (
    <>
      <form className="flex items-center gap-2" id={formId}>
        <label className="text-sm text-zinc-500">City:</label>
        <select
          name={name}
          defaultValue={selected}
          className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Cities</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </form>
      <Script id={`${formId}-script`} strategy="afterInteractive">{`
        (function(){
          var sel = document.querySelector('#${formId} select');
          if (!sel) return;
          sel.addEventListener('change', function(){
            var u = new URL(location.href);
            u.searchParams.set('${name}', this.value);
            if(this.value === 'all') u.searchParams.delete('${name}');
            location.href = u.toString();
          });
        })();
      `}</Script>
    </>
  )
}
