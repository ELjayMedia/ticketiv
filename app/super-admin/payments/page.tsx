import Link from "next/link"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"

export const metadata = { title: "Payment failures | Super Admin" }
export const dynamic = "force-dynamic"

// TICK-51 — Payment failure investigation

const FAILURE_STATUSES = ["failed", "error", "declined", "cancelled", "timed_out"]

type FailedAttemptRow = {
  id: string
  order_id: string | null
  provider: string | null
  attempt_no: number | null
  status: string | null
  ext_ref: string | null
  payload: unknown
  created_at: string | null
  payment_id: string | null
  buyer_email: string | null
  order_status: string | null
  order_total_cents: number | null
  order_currency: string | null
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Intl.DateTimeFormat("en-SZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d))
}

export default async function SuperAdminPaymentFailuresPage({
  searchParams,
}: {
  searchParams?: Promise<{ provider?: string; q?: string }>
}) {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const sp = searchParams ? await searchParams : {}
  const filterProvider = sp.provider
  const filterQ = sp.q?.toLowerCase()

  const admin = createAdminClient()

  let query = admin
    .from("payment_attempts")
    .select(`
      id, order_id, provider, attempt_no, status, ext_ref, payload, created_at, payment_id,
      orders!inner(status, total_cents, currency, buyer_email, org_id)
    `)
    .in("status", FAILURE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(200)

  if (filterProvider) {
    query = query.eq("provider", filterProvider)
  }

  const { data, error } = await query

  if (error) {
    return (
      <div className="p-7">
        <h1 className="text-h1">Payment failures</h1>
        <p className="mt-2 text-[13px] text-danger">{error.message}</p>
      </div>
    )
  }

  let rows: FailedAttemptRow[] = (data ?? []).map((row: any) => ({
    id: row.id,
    order_id: row.order_id,
    provider: row.provider,
    attempt_no: row.attempt_no,
    status: row.status,
    ext_ref: row.ext_ref,
    payload: row.payload,
    created_at: row.created_at,
    payment_id: row.payment_id,
    buyer_email: row.orders?.buyer_email ?? null,
    order_status: row.orders?.status ?? null,
    order_total_cents: row.orders?.total_cents ?? null,
    order_currency: row.orders?.currency ?? null,
  }))

  if (filterQ) {
    rows = rows.filter((r) => {
      const haystack = [r.order_id, r.provider, r.ext_ref, r.buyer_email, r.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(filterQ)
    })
  }

  const providers = Array.from(new Set((data ?? []).map((r: any) => r.provider).filter(Boolean)))

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-2">
        <Link
          href="/super-admin"
          className="inline-flex w-fit items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
        >
          <Icon name="chevL" size={14} />
          Command centre
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-h1">Payment failures</h1>
          <Chip size="sm" variant="muted">{rows.length} shown</Chip>
        </div>
        <p className="text-[13px] text-ink-3">
          Failed, declined and timed-out payment attempts. Trace order → payment_attempt → provider to diagnose stuck checkouts.
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-5">
        <CardBody className="p-5">
          <form className="flex flex-wrap items-end gap-3">
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Order ID, provider reference, buyer email…"
              className="flex-1 min-w-48 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
            />
            <select
              name="provider"
              defaultValue={filterProvider ?? ""}
              className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none"
            >
              <option value="">All providers</option>
              {providers.map((p) => (
                <option key={p as string} value={p as string}>
                  {p as string}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-[var(--radius)] border border-line-2 bg-surface px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-bg"
            >
              Filter
            </button>
            {(filterProvider || filterQ) && (
              <Link
                href="/super-admin/payments"
                className="rounded-[var(--radius)] px-4 py-2 text-[13px] font-semibold text-ink-3 hover:text-ink"
              >
                Clear
              </Link>
            )}
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-[13px] text-ink-3">
            No failed payment attempts match the current filters.
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardBody className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-h3">
                      {row.provider ?? "unknown"} · attempt #{row.attempt_no ?? 1}
                    </p>
                    <Chip
                      size="sm"
                      variant={
                        row.status === "declined" ? "muted" : "default"
                      }
                      className="capitalize"
                    >
                      {row.status}
                    </Chip>
                  </div>
                  <div className="flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                    <span>{fmtDate(row.created_at)}</span>
                    {row.buyer_email && <span>Buyer: {row.buyer_email}</span>}
                    {row.ext_ref && <span>Ext ref: {row.ext_ref}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  {row.order_total_cents != null && (
                    <span>
                      {row.order_currency ?? "SZL"}{" "}
                      {(row.order_total_cents / 100).toFixed(2)}
                    </span>
                  )}
                  {row.order_status && (
                    <Chip size="sm" variant={row.order_status === "paid" ? "active" : "muted"} className="capitalize">
                      Order: {row.order_status}
                    </Chip>
                  )}
                </div>
              </CardBody>

              <CardDivider />

              <CardBody className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="font-mono text-[11px] text-ink-3">
                  Attempt ID: {row.id}
                </span>
                {row.order_id && (
                  <Link
                    href={`/super-admin/orders?q=${row.order_id}`}
                    className="font-mono text-[11px] uppercase tracking-wider text-accent underline-offset-4 hover:underline"
                  >
                    View order →
                  </Link>
                )}
                {row.payment_id && (
                  <span className="font-mono text-[11px] text-ink-3">
                    Payment: {row.payment_id.slice(0, 8)}…
                  </span>
                )}
              </CardBody>

              {row.payload && (
                <>
                  <CardDivider />
                  <CardBody className="px-5 py-3">
                    <details className="group">
                      <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-ink">
                        Provider payload
                      </summary>
                      <pre className="mt-2 max-h-48 overflow-auto rounded-[var(--radius-md)] bg-bg p-3 font-mono text-[10px] leading-relaxed text-ink-3">
                        {JSON.stringify(row.payload, null, 2)}
                      </pre>
                    </details>
                  </CardBody>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
