import Link from "next/link"

import { Pill, type Tone } from "@/components/super-admin/console-ui"
import { Icon } from "@/components/quiet/ui/icon"
import { searchConsole, type SearchHit } from "@/lib/data/admin/console"
import { requireSuperAdmin } from "@/lib/super-admin/auth"

export const metadata = { title: "Search · Admin" }

const GROUPS: Array<{ kind: SearchHit["kind"]; label: string; mark: string }> = [
  { kind: "payment", label: "Payment errors", mark: "PAY" },
  { kind: "order", label: "Orders", mark: "ORD" },
  { kind: "person", label: "People", mark: "ID" },
  { kind: "event", label: "Events", mark: "EV" },
  { kind: "organization", label: "Organizers", mark: "ORG" },
]

const EXAMPLES = ["PAY-1A2B3C4D", "buyer@example.com", "7600 0000", "ABCD-EFGH-JKLM"]

export default async function AdminSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireSuperAdmin()
  const { q = "" } = await searchParams
  const result = q.trim() ? await searchConsole(q) : null

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Search everything</h1>
        <p className="text-sm text-ink-3">
          One box for anything a customer or organizer reads out to you: a name, email, phone number, order number, ticket code or the PAY-
          reference on a payment error screen.
        </p>
      </div>

      <form action="/super-admin/search" method="get" role="search" className="flex flex-col gap-2">
        <label htmlFor="admin-search" className="text-label">
          Search
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-line-2 bg-surface px-3 focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent-soft">
          <Icon name="search" className="h-4 w-4 shrink-0 text-ink-3" />
          <input
            id="admin-search"
            name="q"
            type="search"
            defaultValue={q}
            autoFocus
            autoComplete="off"
            placeholder="PAY- reference, email, phone, order number or name"
            className="min-h-[52px] w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-4"
          />
          <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-surface hover:bg-ink-2">
            Search
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
          <span>Try:</span>
          {EXAMPLES.map((example) => (
            <Link key={example} href={`/super-admin/search?q=${encodeURIComponent(example)}`} className="rounded-full border border-line px-3 py-1 hover:bg-surface-2">
              {example}
            </Link>
          ))}
        </div>
      </form>

      {result?.kind === "payment_reference" ? (
        <p className="rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm leading-relaxed text-accent">
          PAY- codes are the support reference shown when a payment can&apos;t start. They lead to the order and to what the payment
          provider said. Codes from before this console was added were only logged and won&apos;t be found here.
        </p>
      ) : null}

      {result ? (
        <section aria-label="Results" className="overflow-hidden rounded-xl border border-line bg-surface">
          <p className="px-4 py-3 text-[13px] text-ink-3">
            {result.hits.length} result{result.hits.length === 1 ? "" : "s"} for &ldquo;{result.query}&rdquo;
          </p>
          {GROUPS.map((group) => {
            const hits = result.hits.filter((hit) => hit.kind === group.kind)
            if (!hits.length) return null
            return (
              <div key={group.kind}>
                <h2 className="border-t border-line bg-bg px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{group.label}</h2>
                <ul>
                  {hits.map((hit) => (
                    <li key={hit.href + hit.title}>
                      <Link href={hit.href} className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3 hover:bg-accent-soft/30">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[11px] font-bold text-ink-2">{group.mark}</span>
                        <span className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
                          <span className="truncate text-sm font-semibold text-ink">{hit.title}</span>
                          <span className="truncate text-[13px] text-ink-3">{hit.detail}</span>
                        </span>
                        {hit.status ? <Pill tone={hit.tone as Tone}>{hit.status}</Pill> : null}
                        <span className="text-[13px] font-medium text-accent">Open</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          {result.hits.length === 0 ? (
            <p className="border-t border-line px-4 py-10 text-center text-sm text-ink-3">
              No matches. Check the spelling, or search by phone number or order number instead.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
