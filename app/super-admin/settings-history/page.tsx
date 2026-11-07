import Link from "next/link"

import { restoreSettingAction } from "@/app/super-admin/console-actions"
import { Panel, Pill, when } from "@/components/super-admin/console-ui"
import { GuardedAction } from "@/components/super-admin/GuardedAction"
import { listSettingsHistory } from "@/lib/data/admin/console-ops"
import { getAdminContext, requireSuperAdmin } from "@/lib/super-admin/auth"
import { cn } from "@/lib/cn"
import { canDo, describeChange, settingLabel, SETTINGS_TABLES } from "@/lib/super-admin/console"

export const metadata = { title: "Settings history · Admin" }

const OPERATION: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = {
  insert: { label: "Added", tone: "success" },
  update: { label: "Changed", tone: "warning" },
  delete: { label: "Removed", tone: "danger" },
}

export default async function SettingsHistoryPage({ searchParams }: { searchParams: Promise<{ table?: string }> }) {
  await requireSuperAdmin()
  const { table } = await searchParams
  const activeTable = table && SETTINGS_TABLES[table] ? table : null
  const [entries, context] = await Promise.all([listSettingsHistory(activeTable), getAdminContext()])
  const canRestore = canDo("restore_setting", context?.role)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Settings history</h1>
        <p className="text-sm text-ink-3">
          Every change to fees, feature flags, payment routing, pricing plans, provider settings and TapBand config, whoever made it and
          however. Secret values are never stored here.
        </p>
      </div>

      <nav aria-label="Settings" className="flex flex-wrap gap-2">
        {[{ key: null as string | null, label: "All" }, ...Object.entries(SETTINGS_TABLES).map(([key, label]) => ({ key, label }))].map((tab) => (
          <Link
            key={tab.key ?? "all"}
            href={tab.key ? `/super-admin/settings-history?table=${tab.key}` : "/super-admin/settings-history"}
            aria-current={activeTable === tab.key ? "page" : undefined}
            className={cn(
              "inline-flex min-h-[36px] items-center rounded-full border px-3 text-[13px] font-medium",
              activeTable === tab.key ? "border-ink bg-ink text-surface" : "border-line-2 bg-surface text-ink-2 hover:bg-bg",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {entries.length === 0 ? (
        <Panel>
          <p className="text-[13px] text-ink-3">No changes recorded yet. History starts from when this was switched on; earlier changes are in the audit log.</p>
        </Panel>
      ) : (
        <ol className="flex flex-col gap-3">
          {entries.map((entry) => {
            const changes = describeChange(entry.operation, entry.oldRow, entry.newRow)
            const op = OPERATION[entry.operation]
            return (
              <li key={entry.id}>
                <Panel>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <Pill tone={op.tone}>{op.label}</Pill>
                          <span className="text-sm font-semibold text-ink">
                            {SETTINGS_TABLES[entry.table] ?? entry.table}: {settingLabel(entry.newRow ?? entry.oldRow)}
                          </span>
                        </span>
                        <span className="text-[13px] text-ink-3">
                          {when(entry.at)} · {entry.actor ?? "system or SQL editor"}
                          {entry.reason ? ` · reason: ${entry.reason}` : ""} · change #{entry.id}
                        </span>
                      </div>
                    </div>
                    {changes.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] border-collapse text-[13px]">
                          <thead>
                            <tr className="text-left text-xs text-ink-3">
                              <th className="py-1.5 pr-3 font-semibold">Field</th>
                              {entry.operation !== "insert" ? <th className="py-1.5 pr-3 font-semibold">Before</th> : null}
                              {entry.operation !== "delete" ? <th className="py-1.5 font-semibold">After</th> : null}
                            </tr>
                          </thead>
                          <tbody>
                            {changes.slice(0, 20).map((change) => (
                              <tr key={change.field} className="border-t border-line align-top">
                                <td className="py-1.5 pr-3 font-mono text-[12px] text-ink-2">{change.field}</td>
                                {entry.operation !== "insert" ? <td className="break-all py-1.5 pr-3 text-ink-3">{change.before}</td> : null}
                                {entry.operation !== "delete" ? <td className="break-all py-1.5 text-ink">{change.after}</td> : null}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                    {entry.operation !== "insert" ? (
                      <GuardedAction
                        label={entry.operation === "delete" ? "Bring it back" : "Undo this change"}
                        hint="Puts the setting back as it was before"
                        action={restoreSettingAction}
                        hidden={{ historyId: String(entry.id) }}
                        lockedReason={canRestore ? undefined : "Only the owner can restore settings"}
                        explain="Hidden values (keys and secrets) stay as they are now. The restore shows up here as a new change."
                      />
                    ) : null}
                  </div>
                </Panel>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
