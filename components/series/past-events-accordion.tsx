import * as Accordion from "@radix-ui/react-accordion"

import { Icon } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"
import type { SeriesDetailEvent } from "@/lib/data/public/series"
import { SeriesEventRow } from "./series-event-row"

interface PastEventsAccordionProps {
  events: SeriesDetailEvent[]
  label?: string
}

export function PastEventsAccordion({ events, label = "Past dates" }: PastEventsAccordionProps) {
  if (events.length === 0) return null
  return (
    <Accordion.Root type="single" collapsible className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
      <Accordion.Item value="past">
        <Accordion.Header>
          <Accordion.Trigger
            className={cn(
              "group flex w-full items-center justify-between px-4 py-3 text-left text-[14px] font-semibold text-ink",
              "transition-colors hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-inset"
            )}
          >
            <span>
              {label} <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">({events.length})</span>
            </span>
            <Icon
              name="chevD"
              size={16}
              className="shrink-0 text-ink-3 transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="flex flex-col gap-3 border-t border-line px-4 py-4">
            {events.map((event) => (
              <SeriesEventRow key={event.id} event={event} past />
            ))}
          </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  )
}
