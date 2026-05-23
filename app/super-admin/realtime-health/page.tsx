import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSuperAdmin } from "@/lib/super-admin/auth"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface MetricRow {
  label: string
  value: string
  hint?: string
  tone?: "ok" | "warn" | "muted"
}

function ageLabel(iso: string | null | undefined): { value: string; tone: MetricRow["tone"] } {
  if (!iso) return { value: "—", tone: "muted" }
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return { value: "—", tone: "muted" }
  const diffMs = Date.now() - ts
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return { value: "just now", tone: "ok" }
  if (minutes < 60) return { value: `${minutes}m ago`, tone: minutes < 30 ? "ok" : "warn" }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { value: `${hours}h ago`, tone: "warn" }
  const days = Math.floor(hours / 24)
  return { value: `${days}d ago`, tone: "warn" }
}

function chipVariantFor(tone: MetricRow["tone"]) {
  if (tone === "ok") return "active" as const
  if (tone === "warn") return "muted" as const
  return "muted" as const
}

function supabaseProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ""
  const match = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i)
  return match?.[1] ?? "unknown"
}

export default async function SuperAdminRealtimeHealthPage() {
  await requireSuperAdmin()
  const admin = createAdminClient()

  // Run independent queries in parallel — the panel renders as a single
  // server pass and we don't want it to fan out to slow sequential calls.
  const [
    latestStatsRes,
    latestOrderRes,
    latestScanRes,
    webhookBacklogRes,
    stuckJobsRes,
    activeJobsRes,
    auditRes,
  ] = await Promise.all([
    admin
      .from("event_live_stats")
      .select("updated_at, last_order_at, last_scan_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("orders")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("scans")
      .select("scanned_at")
      .eq("outcome", "valid")
      .order("scanned_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("webhook_deliveries")
      .select("id", { count: "exact", head: true })
      .is("delivered_at", null),
    admin
      .from("jobs")
      .select("id, kind, attempts, max_attempts, last_error, created_at, run_after")
      .is("locked_at", null)
      .not("last_error", "is", null)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .not("locked_at", "is", null),
    admin
      .from("audit_log")
      .select("action, table_name, created_at, actor_id")
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  const stats = latestStatsRes.data
  const liveStatsAge = ageLabel(stats?.updated_at)
  const orderAge = ageLabel(latestOrderRes.data?.created_at)
  const scanAge = ageLabel(latestScanRes.data?.scanned_at)
  const webhookBacklog = webhookBacklogRes.count ?? 0
  const stuckJobs = stuckJobsRes.data ?? []
  const activeJobs = activeJobsRes.count ?? 0
  const auditEntries = auditRes.data ?? []

  const projectRef = supabaseProjectRef()
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA ?? null
  const vercelBranch = process.env.VERCEL_GIT_COMMIT_REF ?? null
  const vercelEnv = process.env.VERCEL_ENV ?? null

  const liveLayerRows: MetricRow[] = [
    {
      label: "event_live_stats freshness",
      value: liveStatsAge.value,
      tone: liveStatsAge.tone,
      hint: stats?.updated_at ?? undefined,
    },
    {
      label: "Latest paid order",
      value: orderAge.value,
      tone: orderAge.tone,
      hint: latestOrderRes.data?.created_at ?? undefined,
    },
    {
      label: "Latest valid scan",
      value: scanAge.value,
      tone: scanAge.tone,
      hint: latestScanRes.data?.scanned_at ?? undefined,
    },
  ]

  const opsRows: MetricRow[] = [
    {
      label: "Webhook backlog",
      value: webhookBacklog.toString(),
      tone: webhookBacklog === 0 ? "ok" : webhookBacklog < 10 ? "warn" : "muted",
      hint: "Deliveries with delivered_at = null",
    },
    {
      label: "Active jobs",
      value: activeJobs.toString(),
      tone: "muted",
      hint: "Jobs with locked_at set (currently in-flight)",
    },
    {
      label: "Failing jobs",
      value: stuckJobs.length.toString(),
      tone: stuckJobs.length === 0 ? "ok" : "warn",
      hint: "Not locked, last_error set",
    },
  ]

  const deploymentRows: MetricRow[] = [
    {
      label: "Supabase project",
      value: projectRef,
      tone: "muted",
    },
    {
      label: "Vercel commit",
      value: vercelSha ? vercelSha.slice(0, 7) : "—",
      tone: vercelSha ? "ok" : "muted",
      hint: vercelBranch && vercelEnv ? `${vercelBranch} · ${vercelEnv}` : vercelBranch ?? vercelEnv ?? undefined,
    },
  ]

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">Realtime health</h1>
        <p className="text-[14px] text-ink-3">
          A single-pane view of the live event layer: how recent the stats row updated, whether
          orders and scans are still flowing, and whether webhooks or background jobs are stuck.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {liveLayerRows.map((row) => (
          <MetricCard key={row.label} row={row} />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {opsRows.map((row) => (
          <MetricCard key={row.label} row={row} />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {deploymentRows.map((row) => (
          <MetricCard key={row.label} row={row} />
        ))}
      </section>

      {stuckJobs.length > 0 && (
        <Card>
          <CardBody className="flex flex-col gap-3">
            <p className="text-h3">Failing jobs</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead className="text-left text-[11px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="border-b border-line py-2 pr-3 font-medium">Kind</th>
                    <th className="border-b border-line py-2 pr-3 font-medium">Attempts</th>
                    <th className="border-b border-line py-2 pr-3 font-medium">Last error</th>
                    <th className="border-b border-line py-2 pr-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {stuckJobs.map((job: any) => (
                    <tr key={job.id} className="border-b border-line/60">
                      <td className="py-2 pr-3 font-mono text-[12px]">{job.kind}</td>
                      <td className="py-2 pr-3">{job.attempts}/{job.max_attempts}</td>
                      <td className="py-2 pr-3 text-ink-3">{job.last_error ?? "—"}</td>
                      <td className="py-2 pr-3 text-ink-3">{job.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="flex flex-col gap-3">
          <p className="text-h3">Recent admin activity</p>
          {auditEntries.length === 0 ? (
            <p className="text-[13px] text-ink-3">No recent audit entries.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-[13px]">
              {auditEntries.map((entry: any, idx: number) => (
                <li key={idx} className="flex items-center justify-between rounded-md border border-line bg-bg px-3 py-2">
                  <div className="flex flex-col">
                    <span className="font-mono text-[12px]">{entry.action} · {entry.table_name}</span>
                    <span className="text-[11px] text-ink-3">{entry.actor_id ? `actor ${entry.actor_id.slice(0, 8)}` : "system"}</span>
                  </div>
                  <span className="font-mono text-[11px] text-ink-3">{entry.created_at}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function MetricCard({ row }: { row: MetricRow }) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-label">{row.label}</p>
          <Chip size="sm" variant={chipVariantFor(row.tone)}>
            {row.tone === "ok" ? "ok" : row.tone === "warn" ? "watch" : "—"}
          </Chip>
        </div>
        <p className="text-[24px] font-semibold leading-none text-ink">{row.value}</p>
        {row.hint && <p className="font-mono text-[11px] text-ink-3">{row.hint}</p>}
      </CardBody>
    </Card>
  )
}
