"use client"

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { buildOrganizerDashboardChartData, formatDashboardMoney } from "@/lib/data/organizer/dashboard-charts"

interface KpiRow {
  title: string
  tickets_issued: number
  tickets_checked_in: number
  revenue_cents: number
  currency?: string | null
}

interface DashboardChartsProps {
  kpis: KpiRow[]
  currency?: string | null
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-1 px-5 py-4">
        <p className="text-h3">{title}</p>
        <p className="text-[12px] text-ink-3">{description}</p>
      </CardBody>
      <CardDivider />
      <CardBody>{children}</CardBody>
    </Card>
  )
}

const tooltipStyle = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-line-2)",
  borderRadius: "var(--radius-md)",
  fontSize: 12,
}

type ChartTooltipPayload = {
  payload?: {
    currency?: string
    fullTitle?: string
    revenueCents?: number
  }
}

export default function DashboardCharts({ kpis, currency = "SZL" }: DashboardChartsProps) {
  const chartData = buildOrganizerDashboardChartData(kpis, { fallbackCurrency: currency ?? "SZL" })
  const eventLabelFormatter = (label: unknown, payload?: ChartTooltipPayload[]) => {
    return payload?.[0]?.payload?.fullTitle ?? String(label)
  }
  const moneyFormatter = (value: unknown, _name: unknown, item: ChartTooltipPayload) => {
    const pointCurrency = item.payload?.currency ?? currency ?? "SZL"
    const fallbackCents = Math.round(Number(value) * 100)
    const cents = item.payload?.revenueCents ?? fallbackCents
    return formatDashboardMoney(Number.isFinite(cents) ? cents : 0, pointCurrency)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard title="Tickets sold by event" description="Top events by ticket sales">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-ink-3)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-3)" }} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={eventLabelFormatter} />
            <Bar dataKey="tickets" fill="var(--color-accent)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Revenue by event" description="Total revenue per event">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-ink-3)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-3)" }} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={eventLabelFormatter}
              formatter={moneyFormatter}
            />
            <Line type="monotone" dataKey="revenue" stroke="var(--color-success)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Attendance by event" description="Check-in vs no-show">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-ink-3)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-3)" }} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={eventLabelFormatter} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="checkedIn" fill="var(--color-success)" name="Checked in" radius={[8, 8, 0, 0]} />
            <Bar dataKey="notAttended" fill="var(--color-line-2)" name="No show" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
