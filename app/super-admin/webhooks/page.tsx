import Link from "next/link"
import { ArrowLeft, Webhook } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSuperAdmin } from "@/lib/super-admin/auth"

export const metadata = { title: "Webhooks | Super Admin" }

type Row = {
  source: string
  record_id: string
  action: string
  entity: string
  entity_id: string | null
  occurred_at: string
}

export default async function SuperAdminWebhooksPage() {
  await requireSuperAdmin()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("admin_recent_operations")
    .select("source, record_id, action, entity, entity_id, occurred_at")
    .eq("source", "webhook")
    .order("occurred_at", { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="mb-4 rounded-full px-0 hover:bg-transparent">
        <Link href="/super-admin"><ArrowLeft className="mr-2 h-4 w-4" /> Command Centre</Link>
      </Button>

      <Card className="rounded-2xl">
        <CardHeader className="border-b pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Webhook className="h-4 w-4" /> Webhooks Monitor</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {((data ?? []) as Row[]).length ? ((data ?? []) as Row[]).map((row) => (
            <div key={`${row.source}-${row.record_id}`} className="p-4 text-sm">
              <p className="font-medium">{row.action} · {row.entity}</p>
              <p className="mt-1 text-xs text-muted-foreground">{row.entity_id ?? "No entity"} · {new Date(row.occurred_at).toLocaleString("en-SZ")}</p>
            </div>
          )) : <div className="p-6 text-sm text-muted-foreground">No webhook operations found.</div>}
        </CardContent>
      </Card>
    </main>
  )
}
