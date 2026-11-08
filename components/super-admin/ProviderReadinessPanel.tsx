import {
  approveProviderAction,
  emergencyDisableProviderAction,
  liftProviderBlockAction,
  recordReadinessEvidenceAction,
  removeReadinessEvidenceAction,
  revokeProviderAction,
} from "@/app/super-admin/console-actions"
import { Panel, Pill, when } from "@/components/super-admin/console-ui"
import {
  EmergencyDisableForm,
  ReasonActionForm,
  RecordEvidenceForm,
  RemoveEvidenceButton,
} from "@/components/super-admin/ProviderReadinessForms"
import type { ProviderReadinessView } from "@/lib/data/admin/provider-readiness"
import { READINESS_ITEMS, requiredReadinessItems } from "@/lib/payments/provider-readiness-checklist"

const PROVIDER_LABEL: Record<string, string> = { paystack: "Paystack", momo: "MTN MoMo", deltapay: "DeltaPay" }

const STATE_PILL = {
  live: { label: "Live approved", tone: "success" },
  not_approved: { label: "Not approved", tone: "warning" },
  blocked: { label: "Disabled", tone: "danger" },
} as const

const HISTORY_LABEL: Record<string, string> = {
  evidence_recorded: "Evidence saved",
  evidence_removed: "Evidence removed",
  approved: "Approved for real money",
  revoked: "Approval revoked",
  blocked: "Emergency disabled",
  unblocked: "Block lifted",
}

/** End a free-text reason with a full stop so the next sentence reads cleanly. */
const sentence = (text: string | null) => {
  const value = (text ?? "").trim()
  return value && !/[.!?]$/.test(value) ? `${value}.` : value
}

const itemLabel = (id: string | null) => READINESS_ITEMS.find((i) => i.id === id)?.label ?? id ?? ""

function RefText({ value }: { value: string }) {
  return /^https:\/\//.test(value) ? (
    <a href={value} target="_blank" rel="noopener noreferrer" className="break-all text-accent hover:underline">
      {value}
    </a>
  ) : (
    <span className="break-all text-ink-2">{value}</span>
  )
}

/**
 * TICK-403: going live with a payment provider. The checklist must be
 * complete before approval; emergency disable is one click; every change is
 * recorded below the provider.
 */
export function ProviderReadinessPanel({ provider }: { provider: ProviderReadinessView }) {
  const label = PROVIDER_LABEL[provider.provider] ?? provider.provider
  const pill = STATE_PILL[provider.state]
  const required = requiredReadinessItems(provider.provider)
  const evidenceByItem = new Map(provider.evidence.map((e) => [e.item, e]))
  const items = required.map((id) => {
    const meta = READINESS_ITEMS.find((i) => i.id === id)!
    return { ...meta, recorded: evidenceByItem.has(id) }
  })
  const done = items.filter((i) => i.recorded).length

  return (
    <Panel
      title={label}
      aside={
        <span className="flex flex-wrap items-center justify-end gap-1.5">
          <Pill tone={pill.tone}>{pill.label}</Pill>
          <Pill tone={provider.checkoutEnabled ? "accent" : "muted"}>{provider.checkoutEnabled ? "On at checkout" : "Off at checkout"}</Pill>
        </span>
      }
    >
      <div className="flex flex-col gap-5">
        {provider.state === "blocked" ? (
          <div className="flex flex-col gap-3 rounded-lg border border-danger/30 bg-danger-soft p-3">
            <p className="text-[13px] leading-relaxed text-danger">
              <span className="font-semibold">Disabled {provider.blockedAt ? when(provider.blockedAt) : ""}.</span>{" "}
              {sentence(provider.blockedReason)} It is off at checkout and refused for real money.
            </p>
            <ReasonActionForm
              action={liftProviderBlockAction}
              provider={provider.provider}
              label="Lift the block"
              pendingLabel="Lifting…"
              placeholder="Why it is safe to switch back on"
              variant="outline"
            />
          </div>
        ) : provider.state === "live" ? (
          <p className="text-[13px] leading-relaxed text-ink-2">
            Approved for real money{provider.approvedBy ? ` by ${provider.approvedBy}` : ""}
            {provider.approvedAt ? ` · ${when(provider.approvedAt)}` : ""}.
          </p>
        ) : (
          <p className="text-[13px] leading-relaxed text-ink-2">
            Real-money payments with {label} are refused until it is approved here. Test and sandbox payments keep working.
          </p>
        )}

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[13px] font-semibold text-ink">Go-live checklist</h3>
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
              {done} of {items.length} done
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
            {items.map((item) => {
              const evidence = evidenceByItem.get(item.id)
              return (
                <li key={item.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span aria-hidden className={evidence ? "text-success" : "text-ink-4"}>
                        {evidence ? "✓" : "○"}
                      </span>
                      <span className="text-[13px] font-semibold text-ink">{item.label}</span>
                    </div>
                    {evidence ? (
                      <div className="flex flex-col gap-0.5 pl-5 text-[12px]">
                        <RefText value={evidence.ref} />
                        {evidence.note ? <span className="text-ink-3">{evidence.note}</span> : null}
                        <span className="text-ink-4">
                          {evidence.recordedByEmail ?? "an admin"}
                          {evidence.recordedAt ? ` · ${when(evidence.recordedAt)}` : ""}
                        </span>
                      </div>
                    ) : (
                      <span className="pl-5 text-[12px] text-ink-3">{item.hint}</span>
                    )}
                  </div>
                  {evidence && provider.state !== "live" ? (
                    <RemoveEvidenceButton action={removeReadinessEvidenceAction} provider={provider.provider} item={item.id} label={item.label} />
                  ) : null}
                </li>
              )
            })}
          </ul>
          <details className="group" open={provider.missing.length > 0 && provider.state === "not_approved"}>
            <summary className="cursor-pointer list-none text-[13px] font-semibold text-accent hover:underline">
              {provider.missing.length > 0 ? "Record evidence" : "Replace evidence"}
            </summary>
            <div className="pt-2">
              <RecordEvidenceForm action={recordReadinessEvidenceAction} provider={provider.provider} items={items} />
            </div>
          </details>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 className="text-[13px] font-semibold text-ink">{provider.state === "live" ? "Revoke approval" : "Approve for real money"}</h3>
            {provider.state === "live" ? (
              <ReasonActionForm
                action={revokeProviderAction}
                provider={provider.provider}
                label="Revoke approval"
                pendingLabel="Revoking…"
                placeholder="Why it should stop taking real money"
                variant="outline"
              />
            ) : provider.state === "blocked" ? (
              <p className="text-[13px] text-ink-3">Lift the block first.</p>
            ) : provider.missing.length > 0 ? (
              <>
                <p className="text-[13px] text-ink-3">
                  Record {provider.missing.length === 1 ? "one more item" : `${provider.missing.length} more items`} first:{" "}
                  {provider.missing.map((m) => itemLabel(m)).join(", ")}.
                </p>
                <ReasonActionForm
                  action={approveProviderAction}
                  provider={provider.provider}
                  label="Approve"
                  pendingLabel="Approving…"
                  placeholder="Why it is ready"
                  variant="accent"
                  disabled
                />
              </>
            ) : (
              <ReasonActionForm
                action={approveProviderAction}
                provider={provider.provider}
                label={`Approve ${label}`}
                pendingLabel="Approving…"
                placeholder="Why it is ready for real money"
                variant="accent"
              />
            )}
          </div>
          {provider.state !== "blocked" ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-[13px] font-semibold text-ink">Emergency disable</h3>
              <p className="text-[12px] text-ink-3">Switches {label} off at checkout and refuses real money at once. Lifting the block puts checkout back as it was.</p>
              <EmergencyDisableForm action={emergencyDisableProviderAction} provider={provider.provider} label={label} />
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold text-ink">History</h3>
          {provider.history.length === 0 ? (
            <p className="text-[13px] text-ink-3">No changes yet.</p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {provider.history.map((event) => (
                <li key={event.id} className="text-[12px] leading-relaxed text-ink-2">
                  <span className="font-semibold text-ink">{HISTORY_LABEL[event.action] ?? event.action}</span>
                  {event.item ? ` · ${itemLabel(event.item)}` : ""}
                  {event.reason ? <span className="text-ink-3"> — {event.reason}</span> : null}
                  <span className="text-ink-4">
                    {" "}
                    · {event.actor} · {when(event.at)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Panel>
  )
}
