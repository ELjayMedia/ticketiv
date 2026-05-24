"use client"

// Visible filter controls for /search.
// Mirrors the params accepted by fn_search_events; updates the URL so the
// server component re-renders with the new SSR'd results. We deliberately
// avoid client-side data fetching — every change is a navigation, so back/
// forward navigation also reflects the filter state.

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Icon } from "@/components/quiet/ui/icon"

export interface SelectedFilters {
  category: string | null
  city: string | null
  when: string | null
  onlyFree: boolean
}

interface SearchFilterBarProps {
  categories: ReadonlyArray<string>
  cities: ReadonlyArray<string>
  selected: SelectedFilters
}

const WHEN_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "Any time" },
  { value: "tonight", label: "Tonight" },
  { value: "weekend", label: "This weekend" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
]

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function SearchFilterBar({ categories, cities, selected }: SearchFilterBarProps) {
  const router = useRouter()
  const sp = useSearchParams()

  const replaceParam = React.useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(sp?.toString() ?? "")
      if (value && value.length > 0) params.set(key, value)
      else params.delete(key)
      // Pagination should reset whenever filters change.
      params.delete("offset")
      router.replace(`/search?${params.toString()}`)
    },
    [router, sp],
  )

  const toggleFree = React.useCallback(() => {
    const params = new URLSearchParams(sp?.toString() ?? "")
    if (selected.onlyFree) params.delete("onlyFree")
    else params.set("onlyFree", "1")
    params.delete("offset")
    router.replace(`/search?${params.toString()}`)
  }, [router, sp, selected.onlyFree])

  const hasCategories = categories.length > 0
  const hasCities = cities.length > 0

  return (
    <div className="px-5 pb-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {/* When preset */}
        <FilterSelect
          icon="cal"
          ariaLabel="Filter by date"
          value={selected.when ?? ""}
          onChange={(v) => replaceParam("when", v || null)}
        >
          {WHEN_OPTIONS.map((o) => (
            <option key={o.value || "any"} value={o.value}>
              {o.label}
            </option>
          ))}
        </FilterSelect>

        {/* Category */}
        {hasCategories && (
          <FilterSelect
            icon="ticket"
            ariaLabel="Filter by category"
            value={selected.category ?? ""}
            onChange={(v) => replaceParam("category", v || null)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {titleCase(c)}
              </option>
            ))}
          </FilterSelect>
        )}

        {/* City / venue location */}
        {hasCities && (
          <FilterSelect
            icon="pin"
            ariaLabel="Filter by city"
            value={selected.city ?? ""}
            onChange={(v) => replaceParam("city", v || null)}
          >
            <option value="">All locations</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </FilterSelect>
        )}

        {/* Free only toggle */}
        <button
          type="button"
          onClick={toggleFree}
          aria-pressed={selected.onlyFree}
          className={
            "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
            (selected.onlyFree
              ? "border-transparent bg-accent text-white"
              : "border-line-2 bg-surface text-ink hover:border-line")
          }
        >
          <Icon name="heart" size={11} /> Free only
        </button>
      </div>
    </div>
  )
}

interface FilterSelectProps {
  icon: "cal" | "ticket" | "pin"
  ariaLabel: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}

function FilterSelect({ icon, ariaLabel, value, onChange, children }: FilterSelectProps) {
  const active = value.length > 0
  return (
    <label
      className={
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
        (active
          ? "border-transparent bg-accent-soft text-accent"
          : "border-line-2 bg-surface text-ink hover:border-line")
      }
    >
      <Icon name={icon} size={11} />
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent pr-4 text-xs font-semibold outline-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0 center",
          backgroundSize: "10px 10px",
        }}
      >
        {children}
      </select>
    </label>
  )
}
