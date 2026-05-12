import Link from "next/link"
import { Activity, Building2, CalendarDays, CreditCard, Flag, MapPin, Ticket, WalletCards } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminClient } from "@/lib/supabase/admin"
import { ADMIN_RESOURCES } from "@/lib/super-admin/resources"
import { requireSuperAdmin } from "@/lib/super-admin/auth"
import { signOutSuperAdminAction } from "./actions"

const ICONS = [Building2, MapPin, CalendarDays, Ticket, CreditCard, WalletCards, Flag]

export const metadata = { title: "Super Admin" }

export default async function SuperAdminPage() {
  const user = await requireSuperAdmin()
  const admin = createAdminClient()

  const counts = await Promise.all(
    ADMIN_RESOURCES.map(async (resource) => {
      const { count } = await admin.from(resource.table).select(resource.primaryKey, { count: "exact", head: true })
      return [resource.key, count ?? 0] as const
    }),
  )

  const countMap = new Map(counts)

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ticketiv internal</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Super admin dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage platform records across organizations, venues, events, tickets, orders, payouts and feature flags.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Signed in as {user.email}</p>
        </div>
        <form action={signOutSuperAdminAction}>
          <Button variant="outline" className="rounded-full">Sign out</Button>
        </form>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-3xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Live admin modules</CardTitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <p className="text-3xl font-bold">{ADMIN_RESOURCES.length}</p>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        {ADMIN_RESOURCES.slice(0, 3).map((resource) => (
          <Card key={resource.key} className="rounded-3xl">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{resource.label}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{countMap.get(resource.key) ?? 0}</p></CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ADMIN_RESOURCES.map((resource, index) => {
          const Icon = ICONS[index] ?? Activity
          return (
            <Link key={resource.key} href={`/super-admin/${resource.key}`} className="group block">
              <Card className="h-full rounded-3xl transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle>{resource.label}</CardTitle>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{resource.description}</p>
                  </div>
                  <span className="rounded-full border bg-background p-3"><Icon className="h-5 w-5" /></span>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{countMap.get(resource.key) ?? 0} records</span>
                  <Button className="rounded-full" size="sm">Open CRUD</Button>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </section>
    </main>
  )
}
