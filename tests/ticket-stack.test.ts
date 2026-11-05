import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")

describe("multi-ticket orders scroll vertically", () => {
  const view = read("components/quiet/screens/tickets/ticket-view.tsx")
  const page = read("app/(focused)/tickets/[id]/page.tsx")

  it("renders the whole order on one page and opens on the requested ticket", () => {
    expect(page).toContain("rows.map((ticket, index) => mapTicketView(ticket, { ...opts, position: index + 1 }))")
    expect(page).toContain("<TicketView tickets={tickets} initialTicketId={row.order_item_id} />")
  })

  it("stacks one full-screen ticket per snap point, swiping up (no sideways swipe or full reloads)", () => {
    expect(view).toContain("snap-y snap-mandatory overflow-y-auto")
    expect(view).toContain('className="h-dvh snap-start snap-always"')
    expect(view).not.toContain("onTouchStart")
    expect(view).not.toContain("window.location.assign")
    // The URL follows the ticket in view without navigating.
    expect(view).toContain("window.history.replaceState(window.history.state, \"\", `/tickets/${list[index].id}`)")
  })

  it("watches every valid ticket in the order for the gate check-in", () => {
    expect(view).toContain('list.filter((item) => displayStatus(item) === "issued").map((item) => item.id)')
  })
})
