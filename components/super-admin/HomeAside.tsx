import Link from "next/link"

import { Panel, when } from "@/components/super-admin/console-ui"
import type { AdminActivity } from "@/lib/data/admin/console-ops"
import { cn } from "@/lib/cn"

export interface HealthRow {
  label: string
  value: string
  tone: "success" | "warning" | "danger" | "muted"
  href?: string
}

const TONE: Record<HealthRow["tone"], string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  muted: "text-ink-3",
}

/** Home's side column: is everything up, and what did the team just do. */
export function HomeAside({ health, activity }: { health: HealthRow[]; activity: AdminActivity[] }) {
  return (
    <aside className="flex min-w-0 flex-col gap-4">
      <Panel title="Platform health" aside={<Link href="/super-admin/realtime-health" className="text-accent hover:underline">Details</Link>}>
        <ul className="flex flex-col gap-2.5 text-sm">
          {health.map((row) => (
            <li key={row.label} className="flex items-baseline justify-between gap-3">
              <span className="text-ink-2">{row.label}</span>
              {row.href ? (
                <Link href={row.href} className={cn("text-right font-semibold hover:underline", TONE[row.tone])}>
                  {row.value}
                </Link>
              ) : (
                <span className={cn("text-right font-semibold", TONE[row.tone])}>{row.value}</span>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Recent admin activity" aside={<Link href="/super-admin/audit" className="text-accent hover:underline">Audit log</Link>}>
        {activity.length ? (
          <ul className="flex flex-col gap-3 text-[13px] leading-snug">
            {activity.map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5">
                <span className="text-ink">
                  <strong className="font-semibold">{item.who}</strong>{" "}
                  {item.href ? (
                    <Link href={item.href} className="hover:text-accent hover:underline">
                      {item.summary.charAt(0).toLowerCase() + item.summary.slice(1)}
                    </Link>
                  ) : (
                    item.summary.charAt(0).toLowerCase() + item.summary.slice(1)
                  )}
                </span>
                <span className="text-ink-3">
                  {item.reason ? `${item.reason} · ` : ""}
                  {when(item.at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-3">Nothing yet. Fixes made from the console show up here with who did them and why.</p>
        )}
      </Panel>
    </aside>
  )
}
