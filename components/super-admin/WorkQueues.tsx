import Link from "next/link"

import { takeQueueItemAction } from "@/app/super-admin/console-actions"
import { Dot, when } from "@/components/super-admin/console-ui"
import { TakeItemForm } from "@/components/super-admin/QueueForms"
import type { WorkQueues as WorkQueuesData } from "@/lib/data/admin/console-ops"
import { cn } from "@/lib/cn"
import { QUEUES, type QueueKey } from "@/lib/super-admin/console"

/** Home: everything that needs a person, so nobody has to go looking through tables. */
export function WorkQueues({ data, active, canTake }: { data: WorkQueuesData; active: QueueKey | "all" | "mine"; canTake: boolean }) {
  const total = data.items.length
  const mine = data.items.filter((item) => item.claimedByMe).length
  const items = data.items.filter((item) => (active === "all" ? true : active === "mine" ? item.claimedByMe : item.queue === active))

  const tabs: Array<{ key: QueueKey | "all" | "mine"; label: string; count: number }> = [
    { key: "all", label: "All", count: total },
    { key: "mine", label: "Mine", count: mine },
    ...QUEUES.map((q) => ({ key: q.key, label: q.label, count: data.counts[q.key] })),
  ]

  return (
    <section aria-labelledby="queues-title" className="overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-1 px-5 pt-5">
        <h2 id="queues-title" className="text-h2">
          {total === 0 ? "Nothing needs you right now" : `${total} thing${total === 1 ? "" : "s"} need${total === 1 ? "s" : ""} a person`}
        </h2>
        <p className="text-[13px] text-ink-3">Failed payments, undelivered tickets, money waiting for approval and scanners down before an event.</p>
      </div>
      <nav aria-label="Queues" className="flex flex-wrap gap-2 px-5 py-4">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "all" ? "/super-admin" : `/super-admin?queue=${tab.key}`}
            aria-current={active === tab.key ? "page" : undefined}
            className={cn(
              "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium",
              active === tab.key ? "border-ink bg-ink text-surface" : "border-line-2 bg-surface text-ink-2 hover:bg-bg",
              tab.count === 0 && active !== tab.key && "text-ink-3",
            )}
          >
            {tab.label} <span className="tabular-nums">{tab.count}</span>
          </Link>
        ))}
      </nav>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item.key} className="flex flex-wrap items-start gap-3 border-t border-line px-5 py-3 hover:bg-bg">
              <Dot tone={item.tone} />
              <div className="flex min-w-0 flex-1 basis-72 flex-col gap-0.5">
                <Link href={item.href} className="text-sm font-semibold text-ink hover:text-accent hover:underline">
                  {item.title}
                </Link>
                <span className="text-[13px] text-ink-3">{item.detail}</span>
              </div>
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-ink-2">{QUEUES.find((q) => q.key === item.queue)?.label}</span>
              <span className="w-32 text-xs text-ink-3">{when(item.at)}</span>
              <div className="flex min-w-[96px] flex-col items-end gap-1">
                {item.claimedBy && !item.claimedByMe ? <span className="text-xs text-ink-3">Taken by {item.claimedBy}</span> : null}
                {canTake ? (
                  <TakeItemForm action={takeQueueItemAction} itemKey={item.key} mine={item.claimedByMe} takenByOther={Boolean(item.claimedBy) && !item.claimedByMe} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-line px-5 py-8 text-center text-sm text-ink-3">{active === "mine" ? "You haven't taken anything." : "Nothing in this queue."}</p>
      )}
    </section>
  )
}
