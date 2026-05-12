import Link from "next/link"
import { notFound } from "next/navigation"
import { Archive, ArrowLeft, PauseCircle, PlayCircle, Rocket } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResourceForm } from "@/components/super-admin/ResourceForm"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminResource } from "@/lib/super-admin/resources"
import { requireSuperAdmin } from "@/lib/super-admin/auth"
import {
  archiveEventAction,
  pauseTicketTypeSalesAction,
  publishEventAction,
  resumeTicketTypeSalesAction,
  updateResourceAction,
} from "../../actions"

export default async function SuperAdminEditResourcePage({ params }: { params: Promise<{ resource: string; id: string }> }) {
  await requireSuperAdmin()
  const { resource: resourceKey, id } = await params
  const resource = getAdminResource(resourceKey)

  if (!resource) notFound()

  const admin = createAdminClient()
  const { data, error } = await admin.from(resource.table).select("*").eq(resource.primaryKey, id).maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) notFound()

  async function updateRecord(formData: FormData) {
    "use server"
    await updateResourceAction(resource.key, id, formData)
  }

  async function publishEvent() {
    "use server"
    await publishEventAction(id)
  }

  async function archiveEvent(formData: FormData) {
    "use server"
    await archiveEventAction(id, formData)
  }

  async function pauseSales(formData: FormData) {
    "use server"
    await pauseTicketTypeSalesAction(id, formData)
  }

  async function resumeSales() {
    "use server"
    await resumeTicketTypeSalesAction(id)
  }

  const showEventActions = resource.key === "events"
  const showTicketTypeActions = resource.key === "ticket-types"
  const eventStatus = typeof data.status === "string" ? data.status : null
  const salesStatus = typeof data.sales_status === "string" ? data.sales_status : "on_sale"
  const isPublished = eventStatus === "published"
  const isArchived = eventStatus === "archived"
  const isPaused = salesStatus === "paused"

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" className="mb-4 rounded-full px-0 hover:bg-transparent">
        <Link href={`/super-admin/${resource.key}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to {resource.label}</Link>
      </Button>

      {showEventActions ? (
        <Card className="mb-5 rounded-3xl border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Rocket className="h-5 w-5" /> Event business actions</CardTitle>
            <CardDescription>
              Publish validates required event readiness. Archive removes the event from active operations and records the reason.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <form action={publishEvent} className="rounded-3xl border p-4">
              <p className="font-medium">Publish event</p>
              <p className="mt-1 text-sm text-muted-foreground">Runs readiness checks, updates status and writes an audit entry.</p>
              <Button type="submit" disabled={isPublished || isArchived} className="mt-4 rounded-full">
                {isPublished ? "Already published" : isArchived ? "Archived" : "Publish event"}
              </Button>
            </form>

            <form action={archiveEvent} className="rounded-3xl border p-4">
              <p className="flex items-center gap-2 font-medium"><Archive className="h-4 w-4" /> Archive event</p>
              <p className="mt-1 text-sm text-muted-foreground">Moves this event out of active circulation and captures an audit reason.</p>
              <div className="mt-4 space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Input id="reason" name="reason" placeholder="e.g. Event completed or cancelled" disabled={isArchived} />
              </div>
              <Button type="submit" variant="outline" disabled={isArchived} className="mt-4 rounded-full">
                {isArchived ? "Already archived" : "Archive event"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {showTicketTypeActions ? (
        <Card className="mb-5 rounded-3xl border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PauseCircle className="h-5 w-5" /> Ticket sales actions</CardTitle>
            <CardDescription>
              Pause or resume sales for this ticket tier without changing price, quota, issued tickets, or historical orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <form action={pauseSales} className="rounded-3xl border p-4">
              <p className="flex items-center gap-2 font-medium"><PauseCircle className="h-4 w-4" /> Pause sales</p>
              <p className="mt-1 text-sm text-muted-foreground">Stops new sales while preserving quota and inventory history.</p>
              <div className="mt-4 space-y-2">
                <Label htmlFor="pause-reason">Reason</Label>
                <Input id="pause-reason" name="reason" placeholder="e.g. Sold offline, pricing review, sponsor hold" disabled={isPaused} />
              </div>
              <Button type="submit" variant="outline" disabled={isPaused} className="mt-4 rounded-full">
                {isPaused ? "Sales paused" : "Pause sales"}
              </Button>
            </form>

            <form action={resumeSales} className="rounded-3xl border p-4">
              <p className="flex items-center gap-2 font-medium"><PlayCircle className="h-4 w-4" /> Resume sales</p>
              <p className="mt-1 text-sm text-muted-foreground">Returns this ticket tier to on-sale status and clears the pause reason.</p>
              <Button type="submit" disabled={!isPaused} className="mt-4 rounded-full">
                {isPaused ? "Resume sales" : "Already on sale"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Edit {resource.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResourceForm resource={resource} record={data} action={updateRecord} submitLabel="Save changes" />
        </CardContent>
      </Card>
    </main>
  )
}
