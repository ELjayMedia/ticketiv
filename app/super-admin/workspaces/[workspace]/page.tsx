import Link from "next/link"
import { notFound } from "next/navigation"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
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
        const { count } = await admin
          .from(resource.table as any)
          .select(resource.primaryKey, { count: "exact", head: true })
        return [resource.key, count ?? 0] as const
      }),
    ),
    admin
      .from("admin_workspace_actions")
      .select("key,label,description,target_table,backend_function,is_enabled")
      .eq("workspace_key", workspace.key),
  ])

  if (actionResult.error) throw new Error(actionResult.error.message)

  const actions = (actionResult.data ?? []) as CatalogAction[]
  const countMap = new Map(counts)
  const WorkspaceIcon = workspace.icon

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <Link
        href="/super-admin"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
      >
        <Icon name="chevL" size={14} />
        Command Centre
      </Link>

      <header className="rounded-[var(--radius-xl)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit rounded-full border border-line bg-bg p-3 text-ink">
              <WorkspaceIcon className="h-6 w-6" />
            </span>
            <h1 className="text-h1">{workspace.title}</h1>
            <p className="max-w-2xl text-[13px] leading-6 text-ink-3">{workspace.description}</p>
          </div>
          <Link
            href={resources[0] ? `/super-admin/${resources[0].key}` : "/super-admin"}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink bg-ink px-4 py-2 text-[13px] font-semibold text-surface transition-colors hover:bg-ink-2"
          >
            Open first table
          </Link>
        </div>
      </header>

      <section className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardBody className="px-5 py-4">
            <p className="inline-flex items-center gap-2 text-h3">
              <Icon name="spark" size={16} className="text-ink-3" />
              Operating questions
            </p>
          </CardBody>
          <CardBody className="flex flex-col gap-3">
            {workspace.operatingQuestions.map((question) => (
              <div
                key={question}
                className="flex gap-3 rounded-[var(--radius-md)] border border-line p-3 text-[13px] text-ink"
              >
                <Icon name="check" size={14} className="mt-0.5 shrink-0 text-ink-3" />
                <p>{question}</p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="px-5 py-4">
            <p className="inline-flex items-center gap-2 text-h3">
              <Icon name="fileText" size={16} className="text-ink-3" />
              Business action catalog
            </p>
          </CardBody>
          <CardBody className="grid gap-3 sm:grid-cols-2">
            {actions.length
              ? actions.map((action) => (
                  <div key={action.key} className="rounded-[var(--radius-md)] border border-line p-3 text-[13px]">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-ink">{action.label}</p>
                      <Chip size="sm" variant={action.is_enabled ? "accent" : "muted"}>
                        {action.is_enabled ? "Live" : "Planned"}
                      </Chip>
                    </div>
                    <p className="mt-2 text-[12px] leading-5 text-ink-3">{action.description}</p>
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      Target · {action.target_table}
                      {action.backend_function ? ` · ${action.backend_function}` : ""}
                    </p>
                  </div>
                ))
              : workspace.nextBusinessActions.map((action) => (
                  <div
                    key={action}
                    className="rounded-[var(--radius-md)] border border-dashed border-line-2 p-3 text-[13px]"
                  >
                    <p className="font-semibold text-ink">{action}</p>
                    <p className="mt-1 text-[12px] text-ink-3">
                      Level 3 action button — route this through backend validation and audit logging.
                    </p>
                  </div>
                ))}
          </CardBody>
        </Card>
      </section>

      <section className="mt-5">
        <Card>
          <CardBody className="px-5 py-4">
            <p className="inline-flex items-center gap-2 text-h3">
              <Icon name="settings" size={16} className="text-ink-3" />
              Linked backend resources
            </p>
          </CardBody>
          <CardBody className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {resources.map((resource) => (
              <Link
                key={resource.key}
                href={`/super-admin/${resource.key}`}
                className="group rounded-[var(--radius-lg)] border border-line p-4 transition hover:-translate-y-0.5 hover:bg-bg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-[14px] font-semibold text-ink">{resource.label}</p>
                    <p className="line-clamp-2 text-[13px] leading-6 text-ink-3">{resource.description}</p>
                  </div>
                  <Icon name="arrowR" size={14} className="shrink-0 text-ink-3 transition group-hover:translate-x-1" />
                </div>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  {formatNumber(countMap.get(resource.key) ?? 0)} records
                </p>
              </Link>
            ))}
          </CardBody>
        </Card>
      </section>
    </main>
  )
}
