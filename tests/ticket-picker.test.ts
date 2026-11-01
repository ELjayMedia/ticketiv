// @vitest-environment jsdom
// Ticket picker (Eventbrite-style "Get tickets" step): loads live
// availability, builds a multi-type cart within limits, and posts it to
// the seat-hold action. Also covers the ?tickets=1 deep-link reopen.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: nav.replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => "/events/launch-night",
}))
vi.mock("@vercel/analytics/react", () => ({ track: vi.fn() }))

const GA = "00000000-0000-4000-8000-0000000000a1"
const VIP = "00000000-0000-4000-8000-0000000000b2"
const PAUSED = "00000000-0000-4000-8000-0000000000c3"

const actions = vi.hoisted(() => ({
  loadTicketPickerAction: vi.fn(),
  createSeatHoldAction: vi.fn(),
}))
vi.mock("@/app/(focused)/events/[id]/actions", () => actions)

import {
  TicketPickerProvider,
  useTicketPicker,
} from "@/components/quiet/screens/event-detail/ticket-picker"

// createElement passes children positionally; loosen the required prop.
const Provider = TicketPickerProvider as React.ComponentType<
  Omit<React.ComponentProps<typeof TicketPickerProvider>, "children"> & { children?: React.ReactNode }
>

function OpenButton({ typeId }: { typeId?: string }) {
  const picker = useTicketPicker()
  return React.createElement("button", { id: "open", onClick: () => picker.open(typeId) }, "Get tickets")
}

let root: Root
let container: HTMLDivElement

async function mount(typeId?: string) {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(
      React.createElement(
        Provider,
        {
          eventSlug: "launch-night",
          eventUuid: "00000000-0000-4000-8000-000000000401",
          eventTitle: "Launch Night",
          eventWhenLabel: "Sat 7 Feb · 16:00",
        },
        React.createElement(OpenButton, { typeId }),
      ),
    )
  })
}

function dialog() {
  return document.body.querySelector('[role="dialog"]') as HTMLElement | null
}

function cartValue() {
  return (document.body.querySelector('input[name="items"]') as HTMLInputElement | null)?.value
}

function increase(name: string) {
  const group = document.body.querySelector(`[aria-label="${name} quantity"]`)!
  const button = group.querySelector('[aria-label="Increase"]') as HTMLButtonElement
  act(() => button.click())
  return button
}

beforeEach(() => {
  nav.search = ""
  nav.replace.mockReset()
  actions.loadTicketPickerAction.mockResolvedValue({
    ticketTypes: [
      { id: GA, name: "General", priceMinor: 10000, currency: "SZL", remaining: 100, perUserLimit: null, perOrderLimit: 2, salesStatus: "on_sale" },
      { id: VIP, name: "VIP", priceMinor: 30000, currency: "SZL", remaining: 1, perUserLimit: null, perOrderLimit: null, salesStatus: "on_sale" },
      { id: PAUSED, name: "Early bird", priceMinor: 5000, currency: "SZL", remaining: 10, perUserLimit: null, perOrderLimit: null, salesStatus: "paused" },
    ],
  })
})

afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ""
})

describe("TicketPicker", () => {
  it("builds a multi-type cart capped by per-type limits", async () => {
    await mount()
    await act(async () => (document.getElementById("open") as HTMLButtonElement).click())

    expect(dialog()?.textContent).toContain("Launch Night")
    expect(cartValue()).toBe("")
    expect(dialog()?.textContent).toContain("Select tickets")

    increase("General")
    const gaInc = increase("General")
    expect(gaInc.disabled).toBe(true) // per-order limit of 2
    const vipInc = increase("VIP")
    expect(vipInc.disabled).toBe(true) // only 1 left

    expect(cartValue()).toBe(`${GA}:2,${VIP}:1`)
    // Paused type is shown but cannot be added.
    expect(document.body.querySelector('[aria-label="Early bird quantity"]')).toBeNull()
    expect(dialog()?.textContent).toContain("Sales paused")
    // Buyers pay the ticket subtotal: 2×100 + 1×300 = 500. No fee or VAT is
    // added, because the order RPC charges total_cents = subtotal_cents.
    expect(dialog()?.textContent).toContain("Check out")
    expect(dialog()?.textContent).toContain("Total · 3 tickets")
    expect(dialog()?.textContent).toMatch(/500/)
    expect(dialog()?.textContent).not.toMatch(/Booking fee|VAT/)
  })

  it("preselects the ticket type the buyer tapped", async () => {
    await mount(VIP)
    await act(async () => (document.getElementById("open") as HTMLButtonElement).click())
    expect(cartValue()).toBe(`${VIP}:1`)
  })

  it("reopens from ?tickets=1 with the cart and notice, then cleans the URL", async () => {
    nav.search = `tickets=1&items=${encodeURIComponent(`${GA}:5`)}&hold_failed=1`
    await mount()
    await act(async () => {})

    expect(dialog()?.textContent).toContain("couldn't reserve your tickets")
    expect(cartValue()).toBe(`${GA}:2`) // clamped to the live per-order limit
    expect(nav.replace).toHaveBeenCalledWith("/events/launch-night", { scroll: false })
  })
})
