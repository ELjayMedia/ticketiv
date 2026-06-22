"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Chip } from "@/components/quiet/ui/chip";
import type { ResaleSort, ResaleTicketTypeOption } from "@/lib/data/attendee/ticket-listings";

interface ResaleBrowseControlsProps {
  sort: ResaleSort;
  ticketType: string | null;
  ticketTypes: ResaleTicketTypeOption[];
}

const SORT_OPTIONS: { value: ResaleSort; label: string }[] = [
  { value: "price_asc", label: "Price low→high" },
  { value: "price_desc", label: "Price high→low" },
  { value: "newest", label: "Newest first" },
];

export function ResaleBrowseControls({ sort, ticketType, ticketTypes }: ResaleBrowseControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (value === null) params.delete(key);
      else params.set(key, value);
      startTransition(() => {
        router.replace(`?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams],
  );

  const showTypeFilter = ticketTypes.length > 1;

  return (
    <div className={`flex flex-col gap-3 ${isPending ? "opacity-60" : ""}`}>
      <div>
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">Sort</div>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              size="sm"
              variant={sort === option.value ? "active" : "default"}
              onClick={() => updateParam("sort", option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </div>

      {showTypeFilter && (
        <div>
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
            Ticket type
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip
              size="sm"
              variant={ticketType === null ? "active" : "default"}
              onClick={() => updateParam("ticketType", null)}
            >
              All
            </Chip>
            {ticketTypes.map((type) => (
              <Chip
                key={type.id}
                size="sm"
                variant={ticketType === type.id ? "active" : "default"}
                onClick={() => updateParam("ticketType", type.id)}
              >
                {type.name}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
