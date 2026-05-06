"use client"

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface KpiRow {
  event_title: string
  total_tickets_sold: number
  total_checked_in: number
  total_revenue_cents: number
}

interface DashboardChartsProps {
  kpis: KpiRow[]
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Tickets Sold by Event</CardTitle>
          <CardDescription>Top events by ticket sales</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }} />
              <Bar dataKey="tickets" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by Event</CardTitle>
          <CardDescription>Total revenue per event</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
                formatter={(value: number) => `$${value.toLocaleString()}`}
              />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance by Event</CardTitle>
          <CardDescription>Check-in vs No Show</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }} />
              <Legend />
              <Bar dataKey="attended" fill="#10b981" name="Checked In" radius={[8, 8, 0, 0]} />
              <Bar dataKey="notAttended" fill="#f3f4f6" name="No Show" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
