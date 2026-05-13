import * as Accordion from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SeriesDetailEvent } from "@/lib/data/public/series"
import { SeriesEventRow } from "./series-event-row"

interface PastEventsAccordionProps {
  events: SeriesDetailEvent[]
  label?: string
}

export function PastEventsAccordion({ events, label = "Past dates" }: PastEventsAccordionProps) {
  if (events.length === 0) return null
  return (
    <Accordion.Root type="single" collapsible className="rounded-xl border border-border/50 overflow-hidden">
      <Accordion.Item value="past" className="bg-card">
        <Accordion.Header>
          <Accordion.Trigger
            className={cn(
              "group flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold",
              "transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            )}
          >
            <span>
              {label} <span className="text-muted-foreground">({events.length})</span>
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="space-y-3 border-t border-border/40 px-4 py-4">
            {events.map((event) => (
              <SeriesEventRow key={event.id} event={event} past />
            ))}
          </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  )
}
