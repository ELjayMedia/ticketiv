import { Panel, Pill } from "@/components/super-admin/console-ui"
import { INTEGRATION_KINDS } from "@/lib/integrations/catalog"
import type { IntegrationStatus } from "@/lib/integrations/status"

/**
 * Every outside service in one view: whether it is working, why not, and the
 * setting names it needs. Values are never shown; settings marked secret only
 * ever live in Vercel or, for Chatwoot, encrypted in the console.
 */
export function IntegrationOverview({ statuses }: { statuses: IntegrationStatus[] }) {
  return (
    <div className="flex flex-col gap-4">
      {INTEGRATION_KINDS.map(({ kind, label, oneAtATime }) => {
        const rows = statuses.filter((status) => status.kind === kind)
        if (rows.length === 0) return null
        const active = rows.filter((row) => row.badge === "Active").length
        return (
          <Panel
            key={kind}
            title={label}
            aside={oneAtATime ? "One provider at a time" : `${active} of ${rows.length} active`}
          >
            <ul className="flex flex-col divide-y divide-line">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold text-ink">{row.label}</span>
                    <Pill tone={row.tone}>{row.badge}</Pill>
                    {row.readiness ? <Pill tone={row.readiness.tone}>{row.readiness.badge}</Pill> : null}
                  </div>
                  <p className="text-[13px] text-ink-3">{row.purpose}</p>
                  <p className="text-[13px] leading-relaxed text-ink-2">
                    {row.summary}
                    {row.readiness ? <span className="text-ink-3"> {row.readiness.detail}</span> : null}
                    {row.readiness ? (
                      <a href="#payment-readiness" className="text-accent hover:underline">
                        {" "}
                        Go-live checklist
                      </a>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {row.settings.map((setting) => {
                      const isMissing = row.missing.includes(setting.name)
                      return (
                        <span
                          key={setting.name}
                          title={`${setting.secret ? "Secret. " : ""}${setting.required ? "Required" : "Optional"}${isMissing ? ", not set" : ""}`}
                          className={
                            isMissing
                              ? "rounded-md bg-warning-soft px-1.5 py-0.5 font-mono text-[11px] text-warning"
                              : "rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-3"
                          }
                        >
                          {setting.name}
                          {setting.required ? "" : " (optional)"}
                        </span>
                      )
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )
      })}
    </div>
  )
}
