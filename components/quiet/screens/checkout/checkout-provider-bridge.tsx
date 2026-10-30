"use client"

import * as React from "react"

import { trackBuyerFunnel } from "@/components/analytics/buyer-funnel"

export interface CheckoutProviderMethod {
  id: "paystack" | "momo" | "deltapay"
  label: string
  sub: string
  type: "card" | "mobile_money"
}

const PAYMENT_PROVIDER_COOKIE = "ticketiv_payment_provider"

function writeProviderCookie(provider: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${PAYMENT_PROVIDER_COOKIE}=${encodeURIComponent(provider)}; Path=/; Max-Age=1800; SameSite=Lax${secure}`
}

export function CheckoutProviderBridge({
  methods,
  eventId,
  eventSlug,
  surface = "mobile_checkout",
  children,
}: {
  methods: ReadonlyArray<CheckoutProviderMethod>
  eventId: string
  eventSlug: string
  surface?: "mobile_checkout" | "desktop_checkout"
  children: React.ReactNode
}) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [selectedProvider, setSelectedProvider] = React.useState(methods[0]?.id ?? "")

  React.useEffect(() => {
    const next = methods.some((method) => method.id === selectedProvider)
      ? selectedProvider
      : methods[0]?.id ?? ""
    if (next !== selectedProvider) setSelectedProvider(next)
  }, [methods, selectedProvider])

  React.useEffect(() => {
    if (!selectedProvider) return
    writeProviderCookie(selectedProvider)
    trackBuyerFunnel("payment_method_selected", {
      event_id: eventId,
      event_slug: eventSlug,
      provider: selectedProvider,
      surface,
    })
  }, [eventId, eventSlug, selectedProvider, surface])

  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const onChange = (event: Event) => {
      const input = event.target as HTMLInputElement | null
      if (!input || input.name !== "payment") return
      if (!methods.some((method) => method.id === input.value)) return
      setSelectedProvider(input.value as CheckoutProviderMethod["id"])
    }

    root.addEventListener("change", onChange)

    return () => {
      root.removeEventListener("change", onChange)
    }
  }, [methods])

  return (
    <div ref={rootRef}>
      {children}
    </div>
  )
}
