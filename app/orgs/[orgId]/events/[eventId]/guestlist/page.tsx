import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { getDemoEventById } from "@/lib/demo-data"

export const dynamic = "force-dynamic"

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-1 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</p>
        <p className="font-mono text-[22px] font-semibold tabular-nums text-ink">{value}</p>
      </CardBody>
    </Card>
  )
}

export default async function GuestlistPage({ params }: { params: { orgId: string; eventId: string } }) {
  const { orgId, eventId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  let event: any = null
  let guestlistEntries: any[] = []

  if (demoSessionCookie) {
    try {
      event = getDemoEventById(eventId)
      if (!event) return redirect("/403")
      guestlistEntries = [
        { id: "1", name: "John Doe", email: "john@example.com", status: "fulfilled", created_at: "2024-01-15" },
        { id: "2", name: "Jane Smith", email: "jane@example.com", status: "pending", created_at: "2024-01-14" },
        { id: "3", name: "Bob Johnson", email: "bob@example.com", status: "fulfilled", created_at: "2024-01-13" },
      ]
    } catch {
      /* fall through to redirect */
    }
  } else {
    const supabase = createServerSupabaseClient()
    if (!supabase) return redirect("/login")

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return redirect("/login")

    const { data: eventData } = await supabase
      .from("events")
      .select("id, title")
      .eq("id", eventId)
      .eq("org_id", orgId)
      .maybeSingle()

    if (!eventData) return redirect("/403")
    event = eventData

    const { data: entries = [] } = await supabase
      .from("guestlist_entries")
      .select("id, name, email, status, created_at")
      .eq("event_id", eventId)
    guestlistEntries = entries ?? []
  }

  const fulfilled = guestlistEntries.filter((g) => g.status === "fulfilled").length
  const pending = guestlistEntries.filter((g) => g.status === "pending").length

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/orgs/${orgId}/events/${eventId}/edit`}
              aria-label="Back to event"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-bg"
            >
              <Icon name="chevL" size={16} />
            </Link>
            <div className="flex flex-col gap-1">
              <h1 className="text-h1">Guestlist</h1>
              <p className="text-[13px] text-ink-3">{event?.title}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="md">
              <Icon name="download" size={14} /> Export CSV
            </Button>
            <Button variant="primary" size="md">
              <Icon name="plus" size={14} /> Add guest
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatTile label="Total guests" value={guestlistEntries.length} />
          <StatTile label="Fulfilled" value={fulfilled} />
          <StatTile label="Pending" value={pending} />
        </div>

        <Card>
          <CardBody className="px-5 py-4">
            <p className="text-label">Guests</p>
          </CardBody>
          <CardDivider />
          {guestlistEntries.length === 0 ? (
            <CardBody className="px-5 py-10 text-center">
              <p className="text-[13px] text-ink-3">No guests yet.</p>
            </CardBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 text-left text-label">Name</th>
                    <th className="px-5 py-3 text-left text-label">Email</th>
                    <th className="px-5 py-3 text-left text-label">Status</th>
                    <th className="px-5 py-3 text-left text-label">Added</th>
                    <th className="px-5 py-3 text-right text-label">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {guestlistEntries.map((entry, i) => (
                    <tr key={entry.id} className={i > 0 ? "border-t border-line" : ""}>
                      <td className="px-5 py-3 text-[14px] font-semibold text-ink">{entry.name}</td>
                      <td className="px-5 py-3 text-[13px] text-ink-3">{entry.email}</td>
                      <td className="px-5 py-3">
                        <Chip size="sm" variant={entry.status === "fulfilled" ? "active" : "default"}>
                          {entry.status === "fulfilled" && <Icon name="check" size={12} />}
                          {entry.status}
                        </Chip>
                      </td>
                      <td className="px-5 py-3 font-mono text-[12px] text-ink-3">{entry.created_at}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="sm">
                            {entry.status === "pending" ? "Fulfill" : "Unfulfill"}
                          </Button>
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger-soft"
                            aria-label="Delete"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
