import Link from "next/link"
import { redirect } from "next/navigation"

import { Icon } from "@/components/quiet/ui/icon"
import { getOrganizerCompanion, guideCompleteness } from "@/lib/data/companion"
import { requireEventManager } from "@/lib/organizer/access"
import { localTime } from "@/lib/organizer/guide-form"
import { createServerSupabaseClient } from "@/lib/supabase-server"

import { GuideEditor, UpdatesPanel } from "./guide-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Attendee guide" }

const TZ = "Africa/Mbabane"

/**
 * Organiser: the Attendee guide and official updates for one event. Ticket
 * holders see this in their Event Companion; doors, ages, parking and payment
 * also show on the public event page.
 */
export default async function EventGuidePage({ params }: { params: Promise<{ orgId: string; eventId: string }> }) {
  const { orgId, eventId } = await params
  await requireEventManager(orgId, eventId)

  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")
  const { data: event } = await supabase
    .from("events")
    .select("id, title, starts_at")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!event) redirect("/403")

  const { guide, updates } = await getOrganizerCompanion(eventId)
  const dayLabel = event.starts_at
    ? new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(new Date(event.starts_at))
    : null
  const when = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso))

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <Link
            href={`/orgs/${orgId}/events/${eventId}`}
            className="inline-flex w-fit items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
          >
            <Icon name="chevL" size={14} /> {event.title ?? "Event"}
          </Link>
          <h1 className="text-h1">Attendee guide</h1>
          <p className="max-w-2xl text-[14px] text-ink-3">
            Everything ticket holders need to arrive smoothly. It appears in their tickets as the event guide, and changes as the
            event gets closer: directions before, the QR and doors on the day, what’s on now once they’re in.
          </p>
        </div>

        <GuideEditor
          orgId={orgId}
          eventId={eventId}
          eventTitle={event.title ?? "Your event"}
          eventDayLabel={dayLabel}
          completeness={guideCompleteness(guide)}
          initial={{
            doors: localTime(guide?.doorsOpenAt),
            entrance: guide?.entrance ?? "",
            gettingThere: guide?.gettingThere ?? "",
            parking: guide?.parking ?? "",
            ageRule: guide?.ageRule ?? "",
            paymentNote: guide?.paymentNote ?? "",
            whatToBring: guide?.whatToBring ?? "",
            houseRules: guide?.houseRules ?? "",
            helpContact: guide?.helpContact ?? "",
            programme: (guide?.programme ?? []).map((p) => ({ time: p.time, title: p.title, where: p.where ?? "" })),
            facilities: guide?.facilities ?? [],
          }}
        />

        <UpdatesPanel
          orgId={orgId}
          eventId={eventId}
          updates={updates.map((u) => ({
            id: u.id,
            title: u.title,
            body: u.body,
            notified: u.notified,
            whenLabel: when(u.createdAt),
            hidden: Boolean(u.hiddenAt),
            hiddenReason: u.hiddenReason,
          }))}
        />
      </div>
    </main>
  )
}
