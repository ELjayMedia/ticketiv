// @vitest-environment jsdom
// Checkout screens client-mount regression: full jsdom mount with
// production-exact props — runs effects and countdown timers, which
// renderToString cannot. Guards the hydration/effect phase of checkout.
// Born from UAT B4/B5.
import { afterEach, describe, expect, it, vi } from "vitest"
import React from "react"
import { act } from "react"
import { createRoot } from "react-dom/client"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams("hold=ABC123"),
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

const ticketTypes = [
  {
    id: "00000000-0000-4000-8000-000000000601",
    name: "General Seating",
    priceMinor: 15000,
    remaining: null,
    sublabel: undefined,
  },
]

const mobileProps = {
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
}

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ""
})

function mountAndRun(element: React.ReactElement) {
  const errors: unknown[] = []
  const onError = (e: ErrorEvent) => errors.push(e.error ?? e.message)
  window.addEventListener("error", onError)
  vi.useFakeTimers()
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container, {
    onUncaughtError: (err) => errors.push(err),
    onCaughtError: (err) => errors.push(err),
  })
  act(() => {
    root.render(element)
  })
  // Run mount effects + a few countdown ticks.
  act(() => {
    vi.advanceTimersByTime(3000)
  })
  window.removeEventListener("error", onError)
  return { errors, container, root }
}

describe("UAT B4 client-mount repro", () => {
  it("mounts MobileCheckout and runs effects without throwing", () => {
    const { errors, container } = mountAndRun(
      React.createElement(MobileCheckout as any, mobileProps),
    )
    expect(errors).toEqual([])
    expect(container.textContent).toContain("Checkout")
  })

  it("mounts DesktopCheckout and runs effects without throwing", () => {
    const { errors, container } = mountAndRun(
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
    expect(errors).toEqual([])
    expect(container.textContent).toContain("Buyer details")
  })
})
