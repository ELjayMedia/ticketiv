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

vi.mock("@vercel/analytics/react", () => ({ track: vi.fn() }))

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

// Production-exact composition for the UAT event: one GA type at E150.00,
// remaining=null (anon 42501 at the time), active hold, guest buyer.
const ticketTypes = [
  {
    id: "00000000-0000-4000-8000-000000000601",
    name: "General Seating",
    priceMinor: 15000,
    remaining: null,
    sublabel: undefined,
  },
]

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
        ticketTypes,
        bookingFeeMinor: 0,
        vatRate: 0.15,
        defaultBuyerEmail: "",
        defaultTicketTypeId: "00000000-0000-4000-8000-000000000601",
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
        ticketTypeId: "00000000-0000-4000-8000-000000000601",
        ticketTypeName: "General Seating",
        quantity: 1,
        subtotalMinor: 15000,
        bookingFeeMinor: 0,
        vatRate: 0.15,
        holdSeconds: 518,
        defaultBuyerEmail: "",
      }),
    )
    expect(html.length).toBeGreaterThan(100)
  })
})
