import Link from "next/link"
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, RadioTower, Webhook } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"

export const metadata = { title: "Webhooks | Super Admin" }

type Row = {
  source: string
  record_id: string
  action: string
  entity: string
  entity_id: string | null
  occurred_at: string
}

function isFailure(row: Row) {
  return [row.action, row.entity].join(" ").toLowerCase().match(/fail|error|dead|timeout|timed_out|rejected/)
}

function isPending(row: Row) {
  return [row.action, row.entity].join(" ").toLowerCase().match(/pending|queued|retry|processing|received/)
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-SZ")
}

export default async function SuperAdminWebhooksPage() {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("admin_recent_operations")
    .select("source, record_id, action, entity, entity_id, occurred_at")
    .eq("source", "webhook")
    .order("occurred_at", { ascending: false })
    .limit(150)

  if (error) throw new Error(error.message)

  const rows = ((data ?? []) as Row[])
  const failed = rows.filter(isFailure)
  const pending = rows.filter(isPending)
  const healthy = rows.length - failed.length - pending.length
  const latest = rows[0]

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="mb-4 rounded-full px-0 hover:bg-transparent">
        <Link href="/super-admin"><ArrowLeft className="mr-2 h-4 w-4" /> Command Centre</Link>
      </Button>

      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Operational reliability</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Webhooks Monitor</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review provider callbacks, retry signals and webhook processing health.</p>
      </div>

      <section className="mb-5 grid gap-3 md:grid-cols-4">
        <Card className="rounded-2xl"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Recent webhooks</p><p className="mt-1 text-2xl font-bold">{rows.length}</p></div><Webhook className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card className={failed.length ? "rounded-2xl border-destructive/40" : "rounded-2xl"}><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Failure signals</p><p className="mt-1 text-2xl font-bold">{failed.length}</p></div><AlertTriangle className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Pending/retry</p><p className="mt-1 text-2xl font-bold">{pending.length}</p></div><Clock className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Other/processed</p><p className="mt-1 text-2xl font-bold">{healthy}</p></div><CheckCircle2 className="h-5 w-5 text-muted-foreground" /></CardContent></Card>
      </section>

      {latest ? (
        <Card className="mb-5 rounded-2xl">
          <CardContent className="flex flex-col gap-2 p-4 text-sm md:flex-row md:items-center md:justify-between">
            <div><p className="font-medium">Latest webhook operation</p><p className="mt-1 text-muted-foreground">{latest.action} · {latest.entity}</p></div>
            <Badge variant="outline">{formatDate(latest.occurred_at)}</Badge>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl">
        <CardHeader className="border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><RadioTower className="h-4 w-4" /> Recent webhook operations</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {rows.length ? rows.map((row) => {
            const failure = isFailure(row)
            const pendingWebhook = isPending(row)
            return (
              <div key={`${row.source}-${row.record_id}`} className="flex flex-col gap-2 p-4 text-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{row.action} · {row.entity}</p>
                    {failure ? <Badge variant="destructive">failure</Badge> : pendingWebhook ? <Badge variant="secondary">pending/retry</Badge> : <Badge variant="outline">processed</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{row.entity_id ?? "No entity"} · {formatDate(row.occurred_at)}</p>
                </div>
                {row.entity_id ? <Button asChild size="sm" variant="outline" className="rounded-full"><Link href={`/super-admin/audit?record=${row.entity_id}`}>Audit</Link></Button> : null}
              </div>
            )
          }) : <div className="p-6 text-sm text-muted-foreground">No webhook operations found.</div>}
        </CardContent>
      </Card>
    </main>
  )
}
