import Link from "next/link"

import { replyToCaseAction, resolveCaseAction } from "@/app/super-admin/console-actions"
import { Panel, Pill, when } from "@/components/super-admin/console-ui"
import { CaseReplyForm, ResolveCaseForm } from "@/components/super-admin/CaseForms"
import { listSavedReplies, matchCaseRecords } from "@/lib/data/admin/console-ops"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { cn } from "@/lib/cn"
import { chatwootConversationLink } from "@/lib/support/chatwoot-core"
import { getCase, getChatwootConfig, listCases } from "@/lib/support/chatwoot"

export const metadata = { title: "Cases · Admin" }

const STATUSES = [
  { key: "open", label: "Open" },
  { key: "pending", label: "Pending" },
  { key: "resolved", label: "Resolved" },
] as const

export default async function CasesPage({ searchParams }: { searchParams: Promise<{ c?: string; status?: string; resolved?: string }> }) {
  const { roleTier } = await requireAdminRole(["super_admin", "support_admin"])
  const params = await searchParams
  const config = await getChatwootConfig()

  if (!config.ok) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Cases</h1>
        <Panel title="Connect Chatwoot">
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink-2">
            <p>
              Customers keep talking to you in Chatwoot. Once it&apos;s connected, every conversation shows here next to the person, order and
              event it&apos;s about, and you can reply without switching tabs.
            </p>
            {config.problem ? <p className="rounded-md bg-danger-soft px-3 py-2 text-danger">{config.problem}</p> : null}
            {roleTier === "super_admin" ? (
              <Link href="/super-admin/integrations" className="w-fit rounded-[var(--radius)] bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
                Connect Chatwoot in Integrations
              </Link>
            ) : (
              <p>Ask the owner to connect Chatwoot in Integrations.</p>
            )}
            <p className="text-ink-3">The token stays on the server. Use an agent account that can see every inbox.</p>
          </div>
        </Panel>
      </div>
    )
  }

  const status = STATUSES.find((s) => s.key === params.status)?.key ?? "open"
  const [cases, replies] = await Promise.all([listCases(status), listSavedReplies()])
  const list = cases.ok ? cases.data : []
  const selectedId = Number(params.c) || list[0]?.id || null
  const selected = selectedId ? await getCase(selectedId) : null
  const summary = selected?.ok ? selected.data.summary ?? list.find((c) => c.id === selectedId) ?? null : null
  const match = summary ? await matchCaseRecords(summary.email, summary.phone) : null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Cases</h1>
          <p className="text-sm text-ink-3">Chatwoot conversations, matched to the person, order and event they&apos;re about.</p>
        </div>
        <Link href="/super-admin/replies" className="text-[13px] text-accent hover:underline">
          Manage saved replies
        </Link>
      </div>

      {params.resolved ? <p className="rounded-md bg-success-soft px-3 py-2 text-[13px] text-success">Conversation #{params.resolved} resolved in Chatwoot.</p> : null}
      {!cases.ok ? <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">{cases.error}</p> : null}

      <div className="grid items-start gap-5 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
        <section aria-label="Conversations" className="overflow-hidden rounded-xl border border-line bg-surface">
          <nav aria-label="Status" className="flex gap-1 p-2">
            {STATUSES.map((s) => (
              <Link
                key={s.key}
                href={`/super-admin/cases?status=${s.key}`}
                aria-current={status === s.key ? "page" : undefined}
                className={cn("rounded-full px-3 py-1.5 text-[13px] font-medium", status === s.key ? "bg-ink text-surface" : "text-ink-2 hover:bg-bg")}
              >
                {s.label}
              </Link>
            ))}
          </nav>
          <ul>
            {list.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/super-admin/cases?status=${status}&c=${c.id}`}
                  aria-current={c.id === selectedId ? "true" : undefined}
                  className={cn("flex flex-col gap-1 border-t border-line px-3 py-3", c.id === selectedId ? "bg-accent-soft/50" : "hover:bg-bg")}
                >
                  <span className="flex justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-ink">{c.contactName}</span>
                    <span className="shrink-0 text-xs text-ink-3">{when(c.lastActivityAt)}</span>
                  </span>
                  <span className="line-clamp-2 text-[13px] text-ink-2">{c.lastMessage || "No messages"}</span>
                  <span className="text-xs text-ink-3">
                    #{c.id} · {c.channel} · {c.assignee ?? "Unassigned"}
                    {c.unread ? ` · ${c.unread} unread` : ""}
                  </span>
                </Link>
              </li>
            ))}
            {list.length === 0 && cases.ok ? <li className="border-t border-line px-3 py-8 text-center text-[13px] text-ink-3">No {status} conversations.</li> : null}
          </ul>
        </section>

        <section aria-label="Conversation" className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
          {summary && selected?.ok ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-[17px] font-semibold text-ink">
                    #{summary.id} · {summary.contactName}
                  </h2>
                  <span className="text-[13px] text-ink-3">{[summary.channel, summary.email, summary.phone].filter(Boolean).join(" · ")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <a href={chatwootConversationLink(config.config, summary.id)} target="_blank" rel="noreferrer" className="rounded-[var(--radius)] border border-line-2 px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-bg">
                    Open in Chatwoot
                  </a>
                  {summary.status !== "resolved" ? <ResolveCaseForm action={resolveCaseAction} conversationId={summary.id} /> : null}
                </div>
              </div>
              <ol className="flex flex-col gap-2">
                {selected.data.messages.map((m) => (
                  <li
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                      m.from === "customer" && "self-start bg-surface-2 text-ink",
                      m.from === "agent" && "self-end bg-accent-soft text-ink",
                      m.from === "note" && "self-end border border-warning/30 bg-warning-soft text-ink",
                      m.from === "system" && "self-center bg-transparent text-xs text-ink-3",
                    )}
                  >
                    {m.from !== "system" ? (
                      <span className="mb-0.5 block text-xs text-ink-3">
                        {m.author}
                        {m.from === "note" ? " · internal note" : ""} · {when(m.at)}
                      </span>
                    ) : null}
                    <span className="whitespace-pre-line">{m.text}</span>
                  </li>
                ))}
              </ol>
              <div className="border-t border-line pt-4">
                <CaseReplyForm action={replyToCaseAction} conversationId={summary.id} replies={replies} />
              </div>
            </>
          ) : selected && !selected.ok ? (
            <p className="text-[13px] text-danger">{selected.error}</p>
          ) : (
            <p className="py-10 text-center text-[13px] text-ink-3">Pick a conversation.</p>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          <Panel title="Matched records" aside={match?.matchedBy ? `by ${match.matchedBy}` : undefined}>
            {match && (match.people.length || match.orders.length) ? (
              <ul className="flex flex-col gap-2 text-[13px]">
                {match.people.map((p) => (
                  <li key={p.id}>
                    <Link href={`/super-admin/people/${p.id}`} className="flex justify-between gap-2 rounded-lg border border-line px-3 py-2 hover:border-accent/40 hover:bg-accent-soft/30">
                      <span className="font-semibold text-ink">{p.name}</span>
                      <span className="text-accent">Person</span>
                    </Link>
                  </li>
                ))}
                {match.orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/super-admin/order/${o.id}`} className="flex justify-between gap-2 rounded-lg border border-line px-3 py-2 hover:border-accent/40 hover:bg-accent-soft/30">
                      <span>
                        <span className="font-semibold text-ink">Order {o.ref}</span>
                        <span className="block text-ink-3">{[o.eventTitle, o.status].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="text-accent">Order</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : summary ? (
              <div className="flex flex-col gap-2 text-[13px] text-ink-2">
                <p>No account or order uses this contact&apos;s {summary.email ? "email" : summary.phone ? "phone number" : "details"}.</p>
                <p>Ask for the order number or the email they bought with, then search for it.</p>
                <Link href="/super-admin/search" className="text-accent hover:underline">
                  Search
                </Link>
              </div>
            ) : (
              <p className="text-[13px] text-ink-3">Nothing selected.</p>
            )}
          </Panel>
          {match?.suggestions.length ? (
            <Panel title="Likely fix" className="border-accent/30 bg-accent-soft/30">
              <ul className="flex flex-col gap-3 text-[13px]">
                {match.suggestions.map((s) => (
                  <li key={s.text} className="flex flex-col gap-1.5">
                    <span className="text-ink">{s.text}</span>
                    <Link href={s.href} className="font-semibold text-accent hover:underline">
                      {s.cta}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
