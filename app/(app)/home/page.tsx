import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export default async function AttendeeHomePage() {
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  if (demoSessionCookie) {
    try {
      const demoUser = JSON.parse(demoSessionCookie.value)

      return (
        <div className="mx-auto max-w-[980px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {demoUser.full_name}</h1>
            <p className="text-muted-foreground">Manage your tickets and discover new events</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Browse Events</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/browse">Explore</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">My Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/app/tickets">View All</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/app/payments">History</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No tickets yet. Browse events to get started!</p>
            </CardContent>
          </Card>
        </div>
      )
    } catch (e) {
      // Invalid demo session, continue to Supabase check
    }
  }

  const supabase = createServerSupabaseClient()

  if (!supabase) {
    redirect("/login")
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

  const { data: recentOrders = [] } = await supabase
    .from("order_items")
    .select(`
      id,
      order_id,
      created_at,
      event:events(title, starts_at)
    `)
    .eq("purchaser_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(3)

  return (
    <div className="mx-auto max-w-[980px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name || session.user.email}</h1>
        <p className="text-muted-foreground">Manage your tickets and discover new events</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:border-primary transition-colors cursor-pointer">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Browse Events</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/browse">Explore</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="hover:border-primary transition-colors cursor-pointer">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/app/tickets">View All</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="hover:border-primary transition-colors cursor-pointer">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/app/payments">History</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets yet. Browse events to get started!</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium line-clamp-1">{order.event.title}</p>
                    <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/app/tickets/${order.id}`}>View</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
