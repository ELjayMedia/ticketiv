import Link from "next/link"
import { ArrowLeft, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSuperAdmin } from "@/lib/super-admin/auth"

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatChanges(value: unknown) {
  if (!value) return "—"
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export default async function SuperAdminAuditPage() {
  await requireSuperAdmin()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("audit_log")
    .select("id, org_id, actor_id, table_name, record_id, action, changes, created_at")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-3 rounded-full px-0 hover:bg-transparent">
            <Link href="/super-admin"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Command Centre</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Recent super-admin and system-level changes across Ticketiv.</p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/super-admin/exports/audit"><Download className="mr-2 h-4 w-4" /> Export audit CSV</Link>
        </Button>
      </div>

      <div className="space-y-4">
        {(data ?? []).map((entry) => (
          <Card key={entry.id} className="rounded-3xl">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className="text-base">{entry.table_name} · {entry.action}</CardTitle>
                  <CardDescription>{formatDate(entry.created_at)} · Record {entry.record_id ?? "—"}</CardDescription>
                </div>
                <div className="text-xs text-muted-foreground md:text-right">
                  <div>Actor: {entry.actor_id ?? "system"}</div>
                  <div>Org: {entry.org_id ?? "platform"}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="max-h-72 overflow-auto rounded-2xl bg-muted p-4 text-xs leading-relaxed">
                {formatChanges(entry.changes)}
              </pre>
            </CardContent>
          </Card>
        ))}

        {!data?.length ? (
          <Card className="rounded-3xl">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">No audit entries found yet.</CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  )
}
