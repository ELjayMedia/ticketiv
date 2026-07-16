import { describe, expect, it } from "vitest"

import { buildOrganizerDashboardChartData, formatDashboardMoney } from "@/lib/data/organizer/dashboard-charts"

describe("organizer dashboard charts", () => {
  it("formats chart money with the organization currency", () => {
    expect(formatDashboardMoney(123456, "SZL")).toBe("SZL 1,234.56")
  })

  it("keeps full event titles and clamps no-show counts", () => {
    expect(
      buildOrganizerDashboardChartData(
        [
          {
            title: "A very long event title for a narrow mobile chart",
            tickets_issued: 4,
            tickets_checked_in: 6,
            revenue_cents: 250000,
            currency: "szl",
          },
        ],
        { nameMaxLength: 12 },
      ),
    ).toEqual([
      {
        name: "A very lo...",
        fullTitle: "A very long event title for a narrow mobile chart",
        tickets: 4,
        revenue: 2500,
        revenueCents: 250000,
        checkedIn: 6,
        notAttended: 0,
        currency: "SZL",
      },
    ])
  })
})
