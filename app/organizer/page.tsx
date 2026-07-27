import Link from "next/link"
import { redirect } from "next/navigation"

import { Card } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { getMyContexts } from "@/lib/data/identity/contexts"

export const metadata = { title: "Organizer dashboard" }
export const dynamic = "force-dynamic"

export default async function OrganizerPage() {
  const contexts = await getMyContexts()
  const orgs = contexts.filter((context) => context.kind === "org")

  if (orgs.length === 0) {
    redirect("/onboarding/organizer")
  }

  if (orgs.length === 1) {
    redirect(orgs[0].href)
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[560px] bg-bg px-5 pb-24 pt-20">
      <div className="mb-6">
        <p className="text-label">Organizer</p>
        <h1 className="mt-1 text-h1">Choose a workspace</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
          Open an organization dashboard, then choose the event you want to manage.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        {orgs.map((org) => (
          <Link key={org.key} href={org.href}>
            <Card className="p-4 transition-colors hover:bg-surface-2">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon name="trending" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-ink">{org.label}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-ink-3">
                    {org.sublabel ?? "Organizer"} · events, orders & payouts
                  </div>
                </div>
                <Icon name="chevR" size={16} className="text-ink-3" />
              </div>
            </Card>
          </Link>
        ))}
      </section>
    </main>
  )
}
