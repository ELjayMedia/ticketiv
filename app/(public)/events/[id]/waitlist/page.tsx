import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Bell, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getEventById } from "@/lib/data/events"

interface WaitlistPageProps {
  params: { id: string }
}

export default async function WaitlistPage({ params }: WaitlistPageProps) {
  const event = await getEventById(params.id)

  if (!event) {
    notFound()
  }

  return (
    <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href={`/events/${params.id}`} className="flex items-center gap-2 text-primary hover:underline mb-6">
        <ArrowLeft size={20} />
        Back to Event
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-4">
            <img
              src={event.cover_image_url || "/placeholder.svg"}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
          <p className="text-muted-foreground mb-4">{event.description}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Join the waitlist</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Get notified first</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Join the Waitlist</CardTitle>
            <CardDescription>
              This event is currently sold out. Join the waitlist to be notified when tickets become available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={`/api/waitlist/join`} method="POST" className="space-y-4">
              <input type="hidden" name="eventId" value={params.id} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Number of Tickets</Label>
                <Input id="quantity" name="quantity" type="number" min="1" max="10" defaultValue="1" required />
              </div>

              <Button type="submit" className="w-full">
                Join Waitlist
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                We'll email you when tickets become available. You'll have 15 minutes to complete your purchase.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
