"use client"

// Quiet · Search results
// Pixel-faithful port of QuietSearch (hifi-quiet-extra.jsx), driven by
// fn_search_events results passed from the server.

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Icon } from "@/components/quiet/ui/icon"
import { Card } from "@/components/quiet/ui/card"
import { PHOTOS } from "@/lib/photos"

export interface SearchResultProp {
  id: string
  title: string
  slug: string | null
  cover: string
  whenLabel: string
  venue: string
  city: string | null
  priceLabel: string // "₹500" / "Free"
  isFree: boolean
  category: string | null
}

export interface ActiveFilter {
  key: string
  label: string
}

export interface SearchResultsProps {
  query: string
  filters: ActiveFilter[]
  results: SearchResultProp[]
  totalCount: number
}

function eventHref(r: SearchResultProp): string {
  return `/events/${r.slug ?? r.id}`
}

export function SearchResults({ query, filters, results, totalCount }: SearchResultsProps) {
  const router = useRouter()
  const sp = useSearchParams()
  const [draft, setDraft] = React.useState(query)

  React.useEffect(() => setDraft(query), [query])

  const submit = (next: string) => {
    const params = new URLSearchParams(sp?.toString() ?? "")
    if (next.trim()) params.set("q", next.trim())
    else params.delete("q")
    router.replace(`/search?${params.toString()}`)
  }

  const removeFilter = (key: string) => {
    const params = new URLSearchParams(sp?.toString() ?? "")
    params.delete(key)
    router.replace(`/search?${params.toString()}`)
  }

  return (
    <div className="bg-bg pb-24">
      <div className="h-14" />

      {/* Search bar */}
      <div className="flex items-center gap-2.5 px-5 pb-3 pt-2">
        <button
          aria-label="Back"
          onClick={() => router.back()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
        >
          <Icon name="chevL" size={22} />
        </button>
        <form
          className="flex flex-1 items-center gap-2 rounded-md bg-[#f3f1ee] px-3 py-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit(draft)
          }}
        >
          <Icon name="search" size={16} className="text-ink-3" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search events, artists, venues"
            className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-ink-3"
          />
          {draft && (
            <button
              type="button"
              onClick={() => {
                setDraft("")
                submit("")
              }}
              className="text-ink-3 hover:text-ink"
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </form>
      </div>

      {/* Active filters */}
      {filters.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto px-5 pb-3.5">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => removeFilter(f.key)}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-transparent bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent"
            >
              {f.label} <Icon name="close" size={10} />
            </button>
          ))}
        </div>
      )}

      {/* Result count */}
      <div className="flex items-center justify-between px-5 pb-3">
        <span className="font-mono text-[11px] text-ink-3">
          {totalCount === 0 ? "0 results" : `${totalCount} result${totalCount === 1 ? "" : "s"}`}
        </span>
        <span className="font-mono text-[11px] font-semibold text-accent">Sort: Relevance ▾</span>
      </div>

      {/* Results */}
      <div className="px-5">
        {results.length === 0 ? (
          <Card className="py-10 text-center">
            <div className="text-label mb-2">No matches</div>
            <p className="px-6 text-[13px] text-ink-3">
              Try a different keyword, remove a filter, or browse{" "}
              <Link href="/" className="font-semibold text-accent">
                what's on
              </Link>
              .
            </p>
          </Card>
        ) : (
          results.map((r, i, arr) => (
            <Link
              key={r.id}
              href={eventHref(r)}
              className={`flex gap-3 py-3.5 ${i < arr.length - 1 ? "border-b border-line" : ""}`}
            >
              <div className="h-[76px] w-[76px] flex-shrink-0 overflow-hidden rounded-[10px]">
                <img src={r.cover} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold tracking-tight">{r.title}</span>
                </div>
                {r.category && (
                  <div className="font-mono text-[11px] text-ink-3">{r.category}</div>
                )}
                <div className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-ink-3">
                  <span>{r.whenLabel}</span>
                  <span>·</span>
                  <span className="truncate">{r.venue}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="font-mono text-sm font-semibold">
                  {r.isFree ? "Free" : r.priceLabel}
                </span>
                <span className="inline-flex items-center rounded-md border border-ink bg-ink px-2.5 py-1 text-[12px] font-semibold text-white">
                  Book
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
