import * as Accordion from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AccordionSection {
  id: string
  title: string
  content: string | null
  placeholder: string
}

const DEFAULT_SECTIONS: AccordionSection[] = [
  {
    id: "whats-included",
    title: "What's included",
    content: null,
    placeholder: "Details about what's included with your ticket will appear here.",
  },
  {
    id: "rules",
    title: "Rules & restrictions",
    content: null,
    placeholder: "Event rules and restrictions will appear here.",
  },
  {
    id: "transport",
    title: "Transport & parking",
    content: null,
    placeholder: "Transport options and parking information will appear here.",
  },
  {
    id: "refund",
    title: "Refund policy",
    content: null,
    placeholder: "The refund policy for this event will appear here.",
  },
]

interface EventAccordionProps {
  sections?: Partial<AccordionSection>[]
}

export function EventAccordion({ sections }: EventAccordionProps) {
  const mergedSections = DEFAULT_SECTIONS.map((def) => {
    const override = sections?.find((s) => s.id === def.id)
    return override ? { ...def, ...override } : def
  })

  return (
    <section aria-labelledby="event-details-heading">
      <h2 id="event-details-heading" className="mb-3 font-display text-xl font-bold">
        Event details
      </h2>
      <Accordion.Root type="multiple" className="space-y-0 rounded-xl border border-border/50 overflow-hidden">
        {mergedSections.map((section, i) => (
          <Accordion.Item
            key={section.id}
            value={section.id}
            className={cn("bg-card", i < mergedSections.length - 1 && "border-b border-border/40")}
          >
            <Accordion.Header>
              <Accordion.Trigger
                className={cn(
                  "group flex w-full items-center justify-between px-4 py-4 text-left text-sm font-semibold",
                  "transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                )}
              >
                {section.title}
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="px-4 pb-4 pt-0">
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {section.content ?? section.placeholder}
                </p>
              </div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  )
}
