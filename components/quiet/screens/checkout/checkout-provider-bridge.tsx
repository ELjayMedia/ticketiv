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
  showDesktopPicker = false,
  children,
}: {
  methods: ReadonlyArray<CheckoutProviderMethod>
  eventId: string
  eventSlug: string
  showDesktopPicker?: boolean
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
      surface: showDesktopPicker ? "desktop_checkout" : "mobile_checkout",
    })
  }, [eventId, eventSlug, selectedProvider, showDesktopPicker])

  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const onChange = (event: Event) => {
      const input = event.target as HTMLInputElement | null
      if (!input || input.name !== "payment") return
      if (!methods.some((method) => method.id === input.value)) return
      setSelectedProvider(input.value as CheckoutProviderMethod["id"])
    }

    // Quiet's original mobile artboard included a saved-card affordance. This
    // checkout chooses a payment rail and never stores card details, so remove
    // that control without coupling the shared screen to provider policy.
    const hideSavedMethodControl = () => {
      const button = [...root.querySelectorAll("button")].find((candidate) =>
        candidate.textContent?.includes("Add new payment method"),
      )
      if (button) button.hidden = true
    }

    hideSavedMethodControl()
    const observer = new MutationObserver(hideSavedMethodControl)
    observer.observe(root, { childList: true, subtree: true })
    root.addEventListener("change", onChange)

    return () => {
      observer.disconnect()
      root.removeEventListener("change", onChange)
    }
  }, [methods])

  return (
    <div ref={rootRef}>
      {showDesktopPicker && (
        <section className="mx-auto max-w-[1100px] px-10 pt-6">
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-4">
            <div className="mb-3">
              <h2 className="text-[16px] font-semibold">Payment method</h2>
              <p className="mt-0.5 font-mono text-[11px] text-ink-3">
                Choose how you want to pay. Only methods accepted by this organizer are shown.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {methods.map((method) => {
                const selected = selectedProvider === method.id
                return (
                  <button
                    key={method.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedProvider(method.id)}
                    className={
                      "flex items-start gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-colors " +
                      (selected
                        ? "border-accent bg-accent-soft"
                        : "border-line bg-surface hover:border-line-2")
                    }
                  >
                    <span
                      className={
                        "mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 bg-surface " +
                        (selected ? "border-accent" : "border-line-2")
                      }
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-accent" />}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[14px] font-semibold">{method.label}</span>
                      <span className="font-mono text-[11px] text-ink-3">{method.sub}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}
      {children}
    </div>
  )
}
