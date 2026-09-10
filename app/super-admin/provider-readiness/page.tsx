import Link from "next/link"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"
import {
  PROVIDER_READINESS_CHECKLIST,
  approveProviderProductionReadinessAction,
  emergencyDisableProviderAction,
  revokeProviderProductionReadinessAction,
  saveProviderReadinessEvidenceAction,
} from "./actions"

export const metadata = { title: "Provider readiness | Super Admin" }
export const dynamic = "force-dynamic"

const PROVIDER_LABELS: Record<string, string> = {
  paystack: "Paystack",
  momo: "MTN MoMo",
  deltapay: "DeltaPay",
}

type EvidenceItem = { key: string; label?: string; ref: string }
type ReadinessRow = {
  provider: string
  production_ready: boolean
  approved_at: string | null
  approved_by: string | null
  evidence_refs: unknown
  blocked_at: string | null
  blocked_reason: string | null
  updated_at: string
}
type SettingsRow = { provider: string; is_enabled: boolean; mode: string | null }
type AuditRow = {
  id: string
  actor_id: string | null
  record_id: string | null
  changes: unknown
  created_at: string | null
}

function evidenceMap(value: unknown) {
  const result = new Map<string, string>()
  if (!Array.isArray(value)) return result

  for (const item of value) {
    if (typeof item === "object" && item !== null) {
      const key = "key" in item && typeof item.key === "string" ? item.key : null
      const ref = "ref" in item && typeof item.ref === "string" ? item.ref : null
      if (key && ref) result.set(key, ref)
    }
  }
  return result
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-SZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function statusFor(row: ReadinessRow) {
  if (row.production_ready) return { label: "Ready", className: "bg-emerald-100 text-emerald-800 border-emerald-200" }
  if (row.blocked_at) return { label: "Blocked", className: "bg-red-100 text-red-800 border-red-200" }
  return { label: "Unready", className: "bg-amber-100 text-amber-800 border-amber-200" }
}

function auditLabel(changes: unknown) {
  if (!changes || typeof changes !== "object") return "Provider readiness updated"
  const action = "business_action" in changes && typeof changes.business_action === "string"
    ? changes.business_action
    : "provider_readiness_updated"

  return action
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase())
}

export default async function ProviderReadinessPage() {
  await requireAdminRole(["super_admin"])
  const admin = createAdminClient()

  const [{ data: readinessData, error: readinessError }, { data: settingsData }, { data: auditData }] = await Promise.all([
    admin
      .from("payment_provider_readiness" as any)
      .select("provider, production_ready, approved_at, approved_by, evidence_refs, blocked_at, blocked_reason, updated_at")
      .order("provider"),
    admin
      .from("payment_provider_settings")
      .select("provider, is_enabled, mode")
      .in("provider", ["paystack", "momo", "deltapay"]),
    admin
      .from("audit_log")
      .select("id, actor_id, record_id, changes, created_at")
      .eq("table_name", "payment_provider_readiness")
      .order("created_at", { ascending: false })
      .limit(100),
  ])

  if (readinessError) {
    throw new Error(`Could not load provider readiness: ${readinessError.message}`)
  }

  const rows = (readinessData ?? []) as unknown as ReadinessRow[]
  const settings = new Map(((settingsData ?? []) as SettingsRow[]).map((row) => [row.provider, row]))
  const audit = (auditData ?? []) as AuditRow[]
  const readyCount = rows.filter((row) => row.production_ready).length

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-2">
        <Link href="/super-admin" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Command centre
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Production activation gate</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Payment provider readiness</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Real-money activation is fail-closed. Save non-secret evidence for every checklist item, then approve a provider for production. Test-mode availability remains separate.
            </p>
          </div>
          <div className="rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm">
            {readyCount}/{rows.length} production ready
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-3">
        {rows.map((row) => {
          const evidence = evidenceMap(row.evidence_refs)
          const missing = PROVIDER_READINESS_CHECKLIST.filter((item) => !evidence.has(item.key))
          const state = statusFor(row)
          const providerSettings = settings.get(row.provider)
          const approveAction = approveProviderProductionReadinessAction.bind(null, row.provider)
          const saveAction = saveProviderReadinessEvidenceAction.bind(null, row.provider)
          const revokeAction = revokeProviderProductionReadinessAction.bind(null, row.provider)
          const emergencyAction = emergencyDisableProviderAction.bind(null, row.provider)

          return (
            <section key={row.provider} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="border-b p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{PROVIDER_LABELS[row.provider] ?? row.provider}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Routing: {providerSettings?.is_enabled ? "enabled" : "disabled"} · {providerSettings?.mode ?? "unknown"} mode
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${state.className}`}>{state.label}</span>
                </div>

                {row.blocked_reason ? (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                    <p className="font-semibold">Blocked</p>
                    <p className="mt-1">{row.blocked_reason}</p>
                    <p className="mt-1 text-xs text-red-700">{formatDate(row.blocked_at)}</p>
                  </div>
                ) : null}

                {row.production_ready ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    <p className="font-semibold">Approved for real money</p>
                    <p className="mt-1 text-xs">{formatDate(row.approved_at)} · actor {row.approved_by?.slice(0, 8) ?? "unknown"}</p>
                  </div>
                ) : null}
              </div>

              <form action={saveAction} className="space-y-4 p-5">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">Approval evidence</h3>
                    <span className="text-xs text-muted-foreground">{evidence.size}/{PROVIDER_READINESS_CHECKLIST.length} saved</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">References only—Jira, contract IDs, test reports or document locations. Never paste credentials.</p>
                </div>

                <div className="space-y-3">
                  {PROVIDER_READINESS_CHECKLIST.map((item) => (
                    <label key={item.key} className="block">
                      <span className="flex items-center gap-2 text-xs font-medium">
                        <span className={`size-2 rounded-full ${evidence.has(item.key) ? "bg-emerald-500" : "bg-amber-500"}`} />
                        {item.label}
                      </span>
                      <input
                        name={`evidence_${item.key}`}
                        defaultValue={evidence.get(item.key) ?? ""}
                        disabled={row.production_ready}
                        placeholder="Evidence reference"
                        className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </label>
                  ))}
                </div>

                {!row.production_ready ? (
                  <button type="submit" className="w-full rounded-full border bg-background px-4 py-2 text-sm font-semibold transition hover:bg-muted">
                    Save evidence
                  </button>
                ) : null}
              </form>

              <div className="space-y-3 border-t p-5">
                {!row.production_ready ? (
                  <form action={approveAction}>
                    <button
                      type="submit"
                      disabled={missing.length > 0}
                      className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Approve production readiness
                    </button>
                    {missing.length > 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">Save all {missing.length} missing evidence item{missing.length === 1 ? "" : "s"} before approval.</p>
                    ) : null}
                  </form>
                ) : (
                  <form action={revokeAction} className="space-y-2">
                    <input
                      name="reason"
                      required
                      placeholder="Reason for revocation"
                      className="w-full rounded-lg border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                    />
                    <button type="submit" className="w-full rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted">
                      Revoke production readiness
                    </button>
                  </form>
                )}

                <form action={emergencyAction}>
                  <button type="submit" className="w-full rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                    Emergency disable provider
                  </button>
                </form>
              </div>
            </section>
          )
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Approval and revocation history</h2>
          <p className="mt-1 text-sm text-muted-foreground">Immutable Super Admin audit entries for readiness evidence and activation changes.</p>
        </div>
        {audit.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No provider-readiness admin actions recorded yet.</p>
        ) : (
          <div className="divide-y">
            {audit.map((entry) => {
              const changes = entry.changes && typeof entry.changes === "object" ? entry.changes as Record<string, unknown> : {}
              const reason = typeof changes.reason === "string" ? changes.reason : null
              return (
                <div key={entry.id} className="grid gap-2 p-4 text-sm sm:grid-cols-[10rem_1fr_auto] sm:items-center">
                  <div>
                    <p className="font-semibold">{PROVIDER_LABELS[entry.record_id ?? ""] ?? entry.record_id ?? "Provider"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>
                  </div>
                  <div>
                    <p className="font-medium">{auditLabel(entry.changes)}</p>
                    {reason ? <p className="mt-0.5 text-xs text-muted-foreground">{reason}</p> : null}
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground">{entry.actor_id?.slice(0, 8) ?? "system"}</p>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
