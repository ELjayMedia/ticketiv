import Link from "next/link"
import { redirect } from "next/navigation"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import { canOpenSection } from "@ticketiv/shared"
import { canManageEventIn, requireOrganizerSection } from "@/lib/organizer/access"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

/**
 * Door page for one event (ADR 0002): where door staff and scanners start.
 * Scan opens the single scanner (/scan, offline, device pairing); guestlist
 * and box office stay in the workspace.
 */
export default async function EventDoorPage({ params }: { params: Promise<{ orgId: string; eventId: string }> }) {
  const { orgId, eventId } = await params
  const access = await requireOrganizerSection(orgId, "scan", { eventId })

  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")
  const { data: event } = await supabase
    .from("events")
    .select("id, title, starts_at, org_id")
    .eq("id", eventId)
    .maybeSingle()
  if (!event || event.org_id !== orgId) redirect("/403")

  const tools: { label: string; description: string; icon: IconName; href: string; show: boolean }[] = [
    {
      label: "Scan tickets",
      description: "Open the scanner for this event. Works offline once loaded.",
      icon: "qr",
      href: `/orgs/${orgId}/events/${eventId}/scanner`,
      show: canOpenSection(access.role, "scan"),
    },
    {
      label: "Guestlist",
      description: "Find guests and check them in by name.",
      icon: "clipboard",
      href: `/orgs/${orgId}/events/${eventId}/guestlist`,
      show: canOpenSection(access.role, "guestlist"),
    },
    {
      label: "Box office",
      description: "Sell tickets at the door and close your shift.",
      icon: "wallet",
      href: `/orgs/${orgId}/events/${eventId}/pos`,
      show: canOpenSection(access.role, "boxOffice"),
    },
    {
      label: "Manage event",
      description: "Edit the event, tickets, orders and staff.",
      icon: "settings",
      href: `/orgs/${orgId}/events/${eventId}`,
      show: canManageEventIn(access, eventId),
    },
  ]

  return (
    <main className="flex-1 overflow-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <Link
            href={`/orgs/${orgId}/events`}
            className="mb-1 inline-flex w-fit items-center gap-1 text-[12px] font-medium text-ink-3 hover:text-ink"
          >
            <Icon name="chevL" size={13} />
            My events
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Door</span>
          <h1 className="text-h1">{String(event.title ?? "Event")}</h1>
          {event.starts_at && (
            <p className="text-[13px] text-ink-3">
              {new Date(String(event.starts_at)).toLocaleString("en-SZ", { dateStyle: "full", timeStyle: "short" })}
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {tools
            .filter((tool) => tool.show)
            .map((tool) => (
              <Link key={tool.label} href={tool.href} className="group">
                <Card className="h-full">
                  <CardBody className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent-soft text-accent">
                      <Icon name={tool.icon} size={18} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-semibold text-ink">{tool.label}</span>
                      <span className="text-[13px] text-ink-3">{tool.description}</span>
                    </div>
                    <Icon name="chevR" size={16} className="mt-1 shrink-0 text-ink-4 group-hover:text-ink" />
                  </CardBody>
                </Card>
              </Link>
            ))}
        </div>
      </div>
    </main>
  )
}
