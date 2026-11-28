import Link from "next/link"
import { redirect } from "next/navigation"

import { Logo } from "@/components/Logo"
import { Icon } from "@/components/quiet/ui/icon"
import { VenueOnboarding, type MyVenueClaim } from "@/components/venues/venue-onboarding"
import { getAuthUser } from "@/lib/auth/session"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { VenueClaimStatus } from "@/lib/venues/core"

export const dynamic = "force-dynamic"
export const metadata = { title: "Manage a venue · Ticketiv" }

/** TICK-481 — claim an existing venue or add a new one. */
export default async function VenueOnboardingPage() {
  const user = await getAuthUser()
  if (!user) return redirect("/login?from=/onboarding/venue")
  const supabase = createServerSupabaseClient()

  const { data, error } = supabase ? await supabase.rpc("fn_my_venue_claims") : { data: [], error: null }
  if (error) console.error("[venue onboarding] claims:", error)
  const myClaims: MyVenueClaim[] = (data ?? []).map((c) => ({
    id: c.id,
    venueId: c.venue_id,
    venueName: c.venue_name,
    kind: c.kind === "create" ? "create" : "claim",
    status: c.status as VenueClaimStatus,
    reviewNote: c.review_note,
    createdAt: c.created_at,
  }))

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/me" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline">
          <Icon name="chevL" size={14} />
          Back to profile
        </Link>
      </header>
      <section className="mt-12 flex flex-col gap-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Ticketiv for venues</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-tight text-ink">Manage your venue on Ticketiv.</h1>
          <p className="mt-3 text-[14px] text-ink-2">
            Find your venue to request access, or add it if it isn&apos;t listed. Ticketiv checks every request before the venue shows as
            verified.
          </p>
        </div>
        <VenueOnboarding claims={myClaims} />
      </section>
    </main>
  )
}
