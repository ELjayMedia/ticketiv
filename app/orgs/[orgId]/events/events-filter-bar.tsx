"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Icon } from "@/components/quiet/ui/icon"
import { Chip } from "@/components/quiet/ui/chip"

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
  { value: "paused", label: "Paused" },
] as const

interface EventsFilterBarProps {
  currentQ: string
  currentStatus: string
}

export function EventsFilterBar({ currentQ, currentStatus }: EventsFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [q, setQ] = React.useState(currentQ)

  function push(updates: { q?: string; status?: string }) {
    const next = new URLSearchParams(searchParams.toString())
    if ("q" in updates) {
      if (updates.q) next.set("q", updates.q)
      else next.delete("q")
    }
    if ("status" in updates) {
      if (updates.status && updates.status !== "all") next.set("status", updates.status)
      else next.delete("status")
    }
    router.push(`${pathname}?${next.toString()}`)
  }

  // Debounce the text search so it doesn't fire on every keystroke
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  function handleSearchChange(value: string) {
    setQ(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => push({ q: value }), 400)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div className="relative">
        <Icon
          name="search"
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search events…"
          className="h-10 w-full rounded-[var(--radius-md)] border border-line-2 bg-surface pl-9 pr-3 text-[14px] placeholder:text-ink-4 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft"
        />
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            as="button"
            size="sm"
            variant={currentStatus === opt.value ? "active" : "default"}
            onClick={() => push({ status: opt.value })}
          >
            {opt.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}
