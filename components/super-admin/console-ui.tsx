import Link from "next/link"
import { DEFAULT_EVENT_TIME_ZONE } from "@ticketiv/shared"
import type { ReactNode } from "react"

import { cn } from "@/lib/cn"

export type Tone = "danger" | "warning" | "success" | "accent" | "muted"

const TONES: Record<Tone, string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  accent: "bg-accent-soft text-accent",
  muted: "bg-surface-2 text-ink-2",
}

const DOTS: Record<Tone, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  success: "bg-success",
  accent: "bg-accent",
  muted: "bg-ink-4",
}

export function Pill({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[tone])}>{children}</span>
}

export function Dot({ tone }: { tone: Tone }) {
  return <span aria-hidden="true" className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", DOTS[tone])} />
}

export function Panel({ title, aside, children, className }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface p-4 sm:p-5", className)}>
      {title ? (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {aside ? <div className="text-xs text-ink-3">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function Facts({ items }: { items: Array<{ label: string; value: ReactNode; sub?: ReactNode }> }) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1 bg-surface px-4 py-3">
          <dt className="text-xs text-ink-3">{item.label}</dt>
          <dd className="text-sm font-semibold text-ink">{item.value}</dd>
          {item.sub ? <dd className="text-xs text-ink-3">{item.sub}</dd> : null}
        </div>
      ))}
    </dl>
  )
}

export function Crumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-ink-3">
      {items.map((item, index) => (
        <span key={item.label}>
          {index > 0 ? " / " : null}
          {item.href ? (
            <Link href={item.href} className="text-accent hover:underline">
              {item.label}
            </Link>
          ) : (
            item.label
          )}
        </span>
      ))}
    </nav>
  )
}

export function when(value: string | null | undefined) {
  if (!value) return "Never"
  return new Date(value).toLocaleString("en-SZ", { timeZone: DEFAULT_EVENT_TIME_ZONE, dateStyle: "medium", timeStyle: "short" })
}

export function NotesList({ notes }: { notes: Array<{ id: string; body: string; created_at: string; authorEmail: string | null }> }) {
  if (!notes.length) return <p className="text-[13px] text-ink-3">No notes yet.</p>
  return (
    <ul className="flex flex-col gap-2">
      {notes.map((note) => (
        <li key={note.id} className="rounded-lg border border-line bg-warning-soft/60 px-3 py-2 text-[13px] leading-relaxed text-ink">
          <span className="font-semibold">{note.authorEmail ?? "Admin"}</span> <span className="text-ink-3">· {when(note.created_at)}</span>
          <p className="mt-1 whitespace-pre-line">{note.body}</p>
        </li>
      ))}
    </ul>
  )
}
