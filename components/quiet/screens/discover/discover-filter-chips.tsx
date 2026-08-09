"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"

const CATEGORY_CHIPS = [
  { label: "Music", value: "Music" },
  { label: "Sports", value: "Sports" },
  { label: "Comedy", value: "Comedy" },
  { label: "Arts", value: "Arts" },
  { label: "Food", value: "Food" },
  { label: "Family", value: "Family" },
  { label: "Business", value: "Business" },
  { label: "Free", value: "free" },
] as const

const WHEN_CHIPS = [
  { label: "Today", value: "today" },
  { label: "Tonight", value: "tonight" },
  { label: "This weekend", value: "weekend" },
  { label: "Next week", value: "week" },
] as const

interface DiscoverFilterChipsProps {
  /** Optional: pre-render active category (avoids flash on initial SSR). */
  activeCategory?: string | null
  /** Optional: pre-render active when value. */
  activeWhen?: string | null
}

export function DiscoverFilterChips({
  activeCategory: activeCategoryProp,
  activeWhen: activeWhenProp,
}: DiscoverFilterChipsProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Prefer live searchParams (client-side navigation), fall back to SSR props.
  const category = searchParams?.get("category") ?? activeCategoryProp ?? null
  const when = searchParams?.get("when") ?? activeWhenProp ?? null
  const onlyFree = searchParams?.get("onlyFree") === "1"

  const hasActiveFilter = Boolean(category || when || onlyFree)

  function navigate(params: Record<string, string>) {
    const p = new URLSearchParams(params)
    router.push(`/search?${p}`)
  }

  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
      {/* Date discovery stays inside Discover instead of competing for a bottom tab. */}
      {WHEN_CHIPS.map((chip) => {
        const isActive = when === chip.value
        return (
          <Chip
            key={chip.value}
            as="button"
            variant={isActive ? "active" : "default"}
            size="md"
            onClick={() =>
              isActive
                ? router.push("/search")
                : navigate({ when: chip.value })
            }
          >
            {chip.label}
          </Chip>
        )
      })}

      <Chip
        as="button"
        variant="default"
        size="md"
        onClick={() => router.push("/calendar")}
      >
        <Icon name="cal" size={12} />
        My calendar
      </Chip>

      {/* Category chips */}
      {CATEGORY_CHIPS.map((chip) => {
        const isFreeChip = chip.value === "free"
        const isActive = isFreeChip ? onlyFree : category === chip.value
        return (
          <Chip
            key={chip.value}
            as="button"
            variant={isActive ? "active" : "default"}
            size="md"
            onClick={() => {
              if (isFreeChip) {
                isActive ? router.push("/search") : navigate({ onlyFree: "1" })
              } else {
                isActive
                  ? router.push("/search")
                  : navigate({ category: chip.value })
              }
            }}
          >
            {chip.label}
          </Chip>
        )
      })}

      {/* More filters link */}
      <Chip as="button" variant="default" size="md" onClick={() => router.push("/search")}>
        <Icon name="filter" size={12} />
        Filters
      </Chip>

      {/* Clear — only visible when a filter is active */}
      {hasActiveFilter && (
        <Chip as="button" variant="muted" size="md" onClick={() => router.push("/search")}>
          <Icon name="close" size={12} />
          Clear
        </Chip>
      )}
    </div>
  )
}
