export interface OrganizerDashboardKpi {
  title: string
  tickets_issued: number
  tickets_checked_in: number
  revenue_cents: number
  currency?: string | null
}

export interface OrganizerDashboardChartPoint {
  name: string
  fullTitle: string
  tickets: number
  revenue: number
  revenueCents: number
  checkedIn: number
  notAttended: number
  currency: string
}

export function formatDashboardMoney(cents: number, currency: string = "SZL") {
  return `${currency} ${(cents / 100).toLocaleString("en-SZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function buildOrganizerDashboardChartData(
  kpis: OrganizerDashboardKpi[],
  options: { limit?: number; nameMaxLength?: number; fallbackCurrency?: string } = {},
): OrganizerDashboardChartPoint[] {
  const limit = options.limit ?? 6
  const nameMaxLength = options.nameMaxLength ?? 16
  const fallbackCurrency = options.fallbackCurrency ?? "SZL"

  return kpis.slice(0, limit).map((kpi) => {
    const title = kpi.title.trim() || "Untitled event"
    const checkedIn = Math.max(0, kpi.tickets_checked_in)
    const tickets = Math.max(0, kpi.tickets_issued)
    const revenueCents = Math.max(0, kpi.revenue_cents)
    const currency = kpi.currency?.trim().toUpperCase() || fallbackCurrency

    return {
      name: truncateLabel(title, nameMaxLength),
      fullTitle: title,
      tickets,
      revenue: revenueCents / 100,
      revenueCents,
      checkedIn,
      notAttended: Math.max(0, tickets - checkedIn),
      currency,
    }
  })
}

function truncateLabel(label: string, maxLength: number) {
  if (label.length <= maxLength) return label
  const suffix = "..."
  return `${label.slice(0, Math.max(1, maxLength - suffix.length))}${suffix}`
}
