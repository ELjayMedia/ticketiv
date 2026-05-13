"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import type { EventDetailTicketType } from "@/lib/data/public/event-detail"
import { formatCurrency } from "@/lib/pricing"

interface TicketSelectorProps {
  eventId: string
  ticketTypes: EventDetailTicketType[]
  /** "mobile" renders a sticky bottom buy bar; "desktop" renders an inline buy button */
  variant?: "mobile" | "desktop"
  /** When true, sticky buy bar hints "Choose your pass" until a tier is selected */
  multiDay?: boolean
}

function getAvailable(t: EventDetailTicketType): number {
  if (t.quota == null) return Infinity
  return Math.max(0, t.quota - t.sold_count)
}

export function TicketSelector({ eventId, ticketTypes, variant = "mobile", multiDay = false }: TicketSelectorProps) {
  const router = useRouter()
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(ticketTypes.map((t) => [t.id, 0]))
  )

  const updateQty = useCallback(
    (id: string, delta: number) => {
      setQuantities((prev) => {
        const tier = ticketTypes.find((t) => t.id === id)
        if (!tier) return prev
        const available = getAvailable(tier)
        const maxPerUser = tier.per_user_limit ?? 10
        const current = prev[id] ?? 0
        const next = Math.min(Math.max(0, current + delta), Math.min(available, maxPerUser))
        return { ...prev, [id]: next }
      })
    },
    [ticketTypes]
  )

  const currency = ticketTypes[0]?.currency ?? "ZAR"
  const totalCents = ticketTypes.reduce((sum, t) => sum + (quantities[t.id] ?? 0) * t.price_cents, 0)
  const totalQty = Object.values(quantities).reduce((s, q) => s + q, 0)
  const hasSelection = totalQty > 0

  function handleBuy() {
    if (!hasSelection) return

    const selectedItems = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([ticketTypeId, quantity]) => `${ticketTypeId}:${quantity}`)
      .join(",")

    if (!selectedItems) {
      toast("Please select at least one ticket.")
      return
    }

    router.push(`/events/${eventId}/checkout?items=${encodeURIComponent(selectedItems)}`)
  }

  if (ticketTypes.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">No tickets available yet.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {ticketTypes.map((tier) => {
          const available = getAvailable(tier)
          const isSoldOut = available === 0
          const qty = quantities[tier.id] ?? 0

          return (
            <div
              key={tier.id}
              className="rounded-xl border border-border/50 bg-card p-4 transition-colors data-[soldout=true]:opacity-60"
              data-soldout={isSoldOut}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{tier.name}</span>
                    {isSoldOut && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        Sold out
                      </Badge>
                    )}
                    {!isSoldOut && available <= 10 && (
                      <Badge variant="outline" className="shrink-0 text-xs text-orange-600 border-orange-300">
                        Only {available} left
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-primary">
                    {formatCurrency(tier.price_cents, currency)}
                  </p>
                </div>

                {/* Qty stepper */}
                {!isSoldOut ? (
                  <div
                    className="flex items-center gap-2"
                    role="group"
                    aria-label={`Quantity for ${tier.name}`}
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => updateQty(tier.id, -1)}
                      disabled={qty === 0}
                      aria-label={`Decrease quantity for ${tier.name}`}
                    >
                      <Minus className="h-3 w-3" aria-hidden="true" />
                    </Button>
                    <span
                      className="w-6 text-center text-sm font-semibold tabular-nums"
                      aria-live="polite"
                      aria-label={`${qty} selected`}
                    >
                      {qty}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => updateQty(tier.id, 1)}
                      disabled={qty >= Math.min(available, tier.per_user_limit ?? 10)}
                      aria-label={`Increase quantity for ${tier.name}`}
                    >
                      <Plus className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-[88px]" aria-hidden="true" />
                )}
              </div>
            </div>
          )
        })}

        {/* Subtotal */}
        {hasSelection && (
          <div className="flex items-center justify-between px-1 pt-1">
            <span className="text-sm text-muted-foreground">
              Subtotal ({totalQty} ticket{totalQty !== 1 ? "s" : ""})
            </span>
            <span className="font-semibold">{formatCurrency(totalCents, currency)}</span>
          </div>
        )}
      </div>

      {/* Desktop inline buy button */}
      {variant === "desktop" && (
        <>
          <Separator className="my-4" />
          <Button
            size="lg"
            className="w-full"
            disabled={!hasSelection}
            onClick={handleBuy}
            aria-label={hasSelection ? `Buy tickets — ${formatCurrency(totalCents, currency)}` : "Select tickets to continue"}
          >
            {hasSelection ? `Buy tickets — ${formatCurrency(totalCents, currency)}` : "Select tickets"}
          </Button>
        </>
      )}

      {/* Mobile sticky buy bar */}
      {variant === "mobile" && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-sm"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              {hasSelection ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    {totalQty} ticket{totalQty !== 1 ? "s" : ""}
                  </p>
                  <p className="font-semibold">{formatCurrency(totalCents, currency)}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {multiDay ? "Choose your pass" : "Select tickets above"}
                </p>
              )}
            </div>
            <Button
              size="lg"
              className="shrink-0 px-8"
              disabled={!hasSelection}
              onClick={handleBuy}
              aria-label={hasSelection ? `Buy tickets — ${formatCurrency(totalCents, currency)}` : "Select tickets to continue"}
            >
              {multiDay && !hasSelection ? "Choose your pass" : "Buy tickets"}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
