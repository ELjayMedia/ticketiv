// Checkout screens SSR regression: render both screens exactly as production
// composes them (guest buyer, active hold, remaining=null) — guards against
// render-time crashes reaching the error boundary. Born from UAT B4/B5.
import { describe, expect, it, vi } from "vitest"
import React from "react"
import { renderToString } from "react-dom/server"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams("hold=ABC123&"),
  usePathname: () => "/events/gathering-of-worshipers-test/checkout",
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => React.createElement("a", props, children),
}))

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }))

const fakeQuery: any = {
  select: () => fakeQuery,
  eq: () => fakeQuery,
  maybeSingle: () => Promise.resolve({ data: null, error: null }),
  then: (resolve: any) => resolve({ data: null, error: null }),
}
const fakeSupabase: any = {
  from: () => fakeQuery,
  channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
  removeChannel: () => {},
  rpc: () => Promise.resolve({ data: null, error: null }),
}
vi.mock("@/lib/supabase/client", () => ({ createClient: () => fakeSupabase }))
vi.mock("@/lib/supabase-client", () => ({ createClientSupabaseClient: () => fakeSupabase }))
vi.mock("@/app/(focused)/events/[id]/checkout/actions", () => ({
  startCheckoutAction: vi.fn(async () => ({ ok: false, error: "stub" })),
}))

import { MobileCheckout } from "@/components/quiet/screens/checkout/mobile-checkout"
import { DesktopCheckout } from "@/components/quiet/screens/checkout/desktop-checkout"
import { CheckoutProviderBridge } from "@/components/quiet/screens/checkout/checkout-provider-bridge"

// Production-exact composition for the UAT event: one GA type at E150.00,
// remaining=null (anon 42501 at the time), active hold, guest buyer.
const lines = [
  {
    ticketTypeId: "00000000-0000-4000-8000-000000000601",
    name: "General Seating",
    priceMinor: 15000,
    currency: "SZL",
    quantity: 1,
  },
]
const editTicketsHref = "/events/gathering-of-worshipers-test?tickets=1"

describe("UAT B4 checkout render repro", () => {
  it("renders MobileCheckout without throwing", () => {
    const html = renderToString(
      React.createElement(MobileCheckout as any, {
        eventId: "gathering-of-worshipers-test",
        eventUuid: "00000000-0000-4000-8000-000000000401",
        eventTitle: "Gathering of Worshipers",
        eventPhoto: "/images/dj-set.jpg",
        eventWhenLabel: "Sat 7 Feb · 16:00",
        eventVenue: "Somhlolo National Stadium",
        holdSeconds: 518,
        lines,
        editTicketsHref,
        defaultBuyerEmail: "",
      }),
    )
    expect(html.length).toBeGreaterThan(100)
  })

  it("renders DesktopCheckout without throwing", () => {
    const html = renderToString(
      React.createElement(DesktopCheckout as any, {
        eventId: "gathering-of-worshipers-test",
        eventUuid: "00000000-0000-4000-8000-000000000401",
        eventTitle: "Gathering of Worshipers",
        eventPhoto: "/images/dj-set.jpg",
        eventWhenLabel: "Sat 7 Feb · 16:00",
        lines,
        editTicketsHref,
        holdSeconds: 518,
        defaultBuyerEmail: "",
      }),
    )
    expect(html.length).toBeGreaterThan(100)
  })
})

describe("desktop checkout payment-method picker", () => {
  const desktopProps = {
    eventId: "gathering-of-worshipers-test",
    eventUuid: "00000000-0000-4000-8000-000000000401",
    eventTitle: "Gathering of Worshipers",
    eventPhoto: "/images/dj-set.jpg",
    eventWhenLabel: "Sat 7 Feb · 16:00",
    lines,
    editTicketsHref,
    holdSeconds: 518,
    defaultBuyerEmail: "",
  }
  const methods = [
    { id: "paystack", label: "Card", sub: "Visa · Mastercard", type: "card" },
    { id: "momo", label: "MTN MoMo", sub: "Mobile money", type: "mobile_money" },
  ] as const

  function renderDesktop(bridgeMethods: ReadonlyArray<(typeof methods)[number]>) {
    return renderToString(
      React.createElement(
        CheckoutProviderBridge as any,
        {
          methods: bridgeMethods,
          eventId: desktopProps.eventUuid,
          eventSlug: desktopProps.eventId,
          showDesktopPicker: true,
        },
        React.createElement(DesktopCheckout as any, desktopProps),
      ),
    )
  }

  it("sits in the form column, after the header and before the pay button", () => {
    const html = renderDesktop(methods)
    const picker = html.indexOf("Payment method")
    expect(picker).toBeGreaterThan(-1)
    // Not above the checkout header/stepper (the old bug) ...
    expect(picker).toBeGreaterThan(html.indexOf("back to event"))
    expect(picker).toBeGreaterThan(html.indexOf("Buyer details"))
    // ... and before the policy checkbox and "Continue to payment".
    expect(picker).toBeLessThan(html.indexOf("desktop-policy-acceptance"))
    expect(picker).toBeLessThan(html.indexOf("Continue to payment"))
    expect(html).toContain("MTN MoMo")
    expect(html).toMatch(/aria-pressed="true"[^>]*>[\s\S]*?Card/)
  })

  it("is omitted when the organizer offers no methods or there is no bridge", () => {
    expect(renderDesktop([])).not.toContain("Payment method")
    expect(
      renderToString(React.createElement(DesktopCheckout as any, desktopProps)),
    ).not.toContain("Payment method")
  })
})
