"use client"

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"

interface KpiRow {
  event_title: string
  total_tickets_sold: number
  total_checked_in: number
  total_revenue_cents: number
}

interface DashboardChartsProps {
  kpis: KpiRow[]
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

export default function DashboardCharts({ kpis }: DashboardChartsProps) {
  const chartData = kpis.slice(0, 6).map((k) => ({
    name: k.event_title.substring(0, 15),
    tickets: k.total_tickets_sold,
    revenue: k.total_revenue_cents / 100,
    checkedIn: k.total_checked_in,
  }))

  const attendanceData = kpis.slice(0, 6).map((k) => ({
    name: k.event_title.substring(0, 15),
    attended: k.total_checked_in,
    notAttended: k.total_tickets_sold - k.total_checked_in,
  }))

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard title="Tickets sold by event" description="Top events by ticket sales">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-ink-3)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-3)" }} />
            <Tooltip contentStyle={tooltipStyle} />
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
              formatter={(value: number) => `$${value.toLocaleString()}`}
            />
            <Line type="monotone" dataKey="revenue" stroke="var(--color-success)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Attendance by event" description="Check-in vs no-show">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={attendanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-ink-3)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-3)" }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="attended" fill="var(--color-success)" name="Checked in" radius={[8, 8, 0, 0]} />
            <Bar dataKey="notAttended" fill="var(--color-line-2)" name="No show" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
