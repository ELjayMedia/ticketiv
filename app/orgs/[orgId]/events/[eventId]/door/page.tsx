import Link from "next/link"
import { DEFAULT_EVENT_TIME_ZONE } from "@ticketiv/shared"
import { redirect } from "next/navigation"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import { canOpenSection } from "@ticketiv/shared"
import { canManageEventIn, requireOrganizerSection } from "@/lib/organizer/access"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { cn } from "@/lib/cn"

import { DoorLivePanel, ScanHistoryPanel } from "./door-panels"

export const dynamic = "force-dynamic"

type DoorView = "tools" | "live" | "scans"

/**
 * Door page for one event (ADR 0002): the one place organisers go on event
 * night. Door staff and scanners see the tools (scanner, guestlist, box
 * office); managers also get Live (who's in, pace, entrances, scanners) and
 * Scan history tabs. The old /live and /scans pages redirect here.
 */
export default async function EventDoorPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; eventId: string }>
  searchParams: Promise<{ view?: string | string[] }>
}) {
  const { orgId, eventId } = await params
  const { view: rawView } = await searchParams
  const access = await requireOrganizerSection(orgId, "scan", { eventId })
  const isManager = canManageEventIn(access, eventId)
  const view: DoorView = isManager && (rawView === "live" || rawView === "scans") ? rawView : "tools"

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
      show: isManager,
    },
  ]

  return (
    <main className="flex-1 overflow-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
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
              {new Date(String(event.starts_at)).toLocaleString("en-SZ", { timeZone: DEFAULT_EVENT_TIME_ZONE, dateStyle: "full", timeStyle: "short" })}
            </p>
          )}
        </div>

        {isManager ? (
          <nav aria-label="Door views" className="flex w-full max-w-md rounded-[var(--radius-md)] bg-line/40 p-1">
            {([
              { key: "tools", label: "Door" },
              { key: "live", label: "Live" },
              { key: "scans", label: "Scan history" },
            ] as const).map((tab) => (
              <Link
                key={tab.key}
                href={`/orgs/${orgId}/events/${eventId}/door${tab.key === "tools" ? "" : `?view=${tab.key}`}`}
                aria-current={view === tab.key ? "page" : undefined}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-center text-[12px] font-medium transition-colors",
                  view === tab.key ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        ) : null}

        {view === "live" ? (
          <DoorLivePanel supabase={supabase} orgId={orgId} eventId={eventId} eventTitle={String(event.title ?? "Event")} />
        ) : view === "scans" ? (
          <ScanHistoryPanel supabase={supabase} orgId={orgId} eventId={eventId} />
        ) : (
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
        )}
      </div>
    </main>
  )
}
