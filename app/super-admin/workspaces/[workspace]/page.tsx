import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Database, Lightbulb } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminResources } from "@/lib/super-admin/resources"
import { getAdminWorkspace } from "@/lib/super-admin/workspaces"
import { requireSuperAdmin } from "@/lib/super-admin/auth"
import { formatNumber } from "@/lib/super-admin/command-centre"

type CatalogAction = {
  key: string
  label: string
  description: string
  target_table: string
  backend_function: string | null
  is_enabled: boolean
}

export default async function SuperAdminWorkspacePage({ params }: { params: Promise<{ workspace: string }> }) {
  await requireSuperAdmin()
  const { workspace: workspaceKey } = await params
  const workspace = getAdminWorkspace(workspaceKey)

  if (!workspace) notFound()

  const resources = getAdminResources(workspace.resources)
  const admin = createAdminClient()

  const [counts, actionResult] = await Promise.all([
    Promise.all(
      resources.map(async (resource) => {
        const { count } = await admin.from(resource.table).select(resource.primaryKey, { count: "exact", head: true })
        return [resource.key, count ?? 0] as const
      }),
    ),
    admin.from("admin_workspace_actions").select("key,label,description,target_table,backend_function,is_enabled").eq("workspace_key", workspace.key),
  ])

  if (actionResult.error) throw new Error(actionResult.error.message)

  const actions = (actionResult.data ?? []) as CatalogAction[]
  const countMap = new Map(counts)
  const Icon = workspace.icon

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="mb-4 rounded-full px-0 hover:bg-transparent">
        <Link href="/super-admin"><ArrowLeft className="mr-2 h-4 w-4" /> Command Centre</Link>
      </Button>

      <header className="rounded-3xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="inline-flex rounded-full border bg-background p-3"><Icon className="h-6 w-6" /></span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">{workspace.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{workspace.description}</p>
          </div>
          <Button asChild className="rounded-full">
            <Link href={resources[0] ? `/super-admin/${resources[0].key}` : "/super-admin"}>Open first table</Link>
          </Button>
        </div>
      </header>

      <section className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Operating questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workspace.operatingQuestions.map((question) => (
              <div key={question} className="flex gap-3 rounded-2xl border p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p>{question}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Business action catalog</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {actions.length ? actions.map((action) => (
              <div key={action.key} className="rounded-2xl border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{action.label}</p>
                  <span className={action.is_enabled ? "rounded-full bg-primary/10 px-2 py-1 text-[11px] text-primary" : "rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground"}>
                    {action.is_enabled ? "Live" : "Planned"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{action.description}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">Target: {action.target_table}{action.backend_function ? ` · ${action.backend_function}` : ""}</p>
              </div>
            )) : workspace.nextBusinessActions.map((action) => (
              <div key={action} className="rounded-2xl border border-dashed p-3 text-sm">
                <p className="font-medium">{action}</p>
                <p className="mt-1 text-xs text-muted-foreground">Level 3 action button: route this through backend validation and audit logging.</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-5">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Linked backend resources</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {resources.map((resource) => (
              <Link key={resource.key} href={`/super-admin/${resource.key}`} className="group rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:bg-muted/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{resource.label}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{resource.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1" />
                </div>
                <p className="mt-4 text-xs text-muted-foreground">{formatNumber(countMap.get(resource.key) ?? 0)} records</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
