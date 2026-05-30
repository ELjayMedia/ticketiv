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

interface Scan {
  id: string
  ticket_code: string
  scanned_at: string
  device_id: string | null
  outcome: string
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: "success" | "danger"
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-1 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</p>
        <p
          className={
            tone === "success"
              ? "font-mono text-[22px] font-semibold tabular-nums text-success"
              : tone === "danger"
                ? "font-mono text-[22px] font-semibold tabular-nums text-danger"
                : "font-mono text-[22px] font-semibold tabular-nums text-ink"
          }
        >
          {value}
        </p>
      </CardBody>
    </Card>
  )
}

export default async function ScansPage({ params }: { params: { orgId: string; eventId: string } }) {
  const { orgId, eventId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  let event: any = null
  let scans: Scan[] = []

  if (demoSessionCookie) {
    try {
      event = getDemoEventById(eventId)
      if (!event) return redirect("/403")
      scans = [
        { id: "1", ticket_code: "TK001", scanned_at: "2024-01-15 19:30:45", device_id: "Scanner1", outcome: "success" },
        { id: "2", ticket_code: "TK002", scanned_at: "2024-01-15 19:31:12", device_id: "Scanner1", outcome: "success" },
        { id: "3", ticket_code: "TK003", scanned_at: "2024-01-15 19:32:05", device_id: "Scanner2", outcome: "already_scanned" },
        { id: "4", ticket_code: "INVALID", scanned_at: "2024-01-15 19:33:20", device_id: "Scanner2", outcome: "invalid" },
      ]
    } catch {
      /* fall through */
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

    const { data: scansData = [] } = await supabase
      .from("scans")
      .select("id, ticket_code, scanned_at, device_id, outcome")
      .eq("event_id", eventId)
      .order("scanned_at", { ascending: false })
      .limit(100)
    scans = (scansData ?? []) as Scan[]
  }

  const totalScans = scans.length
  const successfulScans = scans.filter((s) => s.outcome === "success").length
  const failedScans = totalScans - successfulScans

  function outcomeChip(outcome: string) {
    if (outcome === "success") return <Chip size="sm" variant="active">success</Chip>
    if (outcome === "invalid") {
      return (
        <Chip size="sm" variant="muted" className="bg-danger-soft text-danger">
          invalid
        </Chip>
      )
    }
    return <Chip size="sm" variant="default">Already scanned</Chip>
  }

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
              <h1 className="text-h1">Scan history</h1>
              <p className="text-[13px] text-ink-3">{event?.title}</p>
            </div>
          </div>
          <a href={`/api/orgs/${orgId}/events/${eventId}/attendees.csv`}>
            <Button variant="outline" size="md">
              <Icon name="download" size={14} />
              Export CSV
            </Button>
          </a>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatTile label="Total scans" value={totalScans} />
          <StatTile label="Successful" value={successfulScans} tone="success" />
          <StatTile label="Failed" value={failedScans} tone="danger" />
        </div>

        <Card>
          <CardBody className="flex flex-col gap-1 px-5 py-4">
            <p className="text-label">Recent scans</p>
            <p className="text-[12px] text-ink-3">Latest scan activity for this event.</p>
          </CardBody>
          <CardDivider />
          {scans.length === 0 ? (
            <CardBody className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <Icon name="qr" size={32} className="text-ink-4" />
              <p className="text-[13px] text-ink-3">No scans yet.</p>
            </CardBody>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 text-left text-label">Ticket ID</th>
                    <th className="px-5 py-3 text-left text-label">Scanned at</th>
                    <th className="px-5 py-3 text-left text-label">Scanned by</th>
                    <th className="px-5 py-3 text-left text-label">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan, i) => (
                    <tr key={scan.id} className={i > 0 ? "border-t border-line" : ""}>
                      <td className="px-5 py-3 font-mono text-[13px] text-ink">{scan.ticket_code}</td>
                      <td className="px-5 py-3 font-mono text-[12px] text-ink-3">{scan.scanned_at}</td>
                      <td className="px-5 py-3 text-[13px] text-ink-3">{scan.device_id ?? "—"}</td>
                      <td className="px-5 py-3">{outcomeChip(scan.outcome)}</td>
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
