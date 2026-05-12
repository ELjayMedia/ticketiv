import Link from "next/link"
import { notFound } from "next/navigation"
import { Archive, ArrowLeft, BadgeDollarSign, EyeOff, PauseCircle, PlayCircle, QrCode, Rocket, TicketX, Unlink } from "lucide-react"

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
  assignDeviceToEventAction,
  hideTicketTypeAction,
  markTicketTypeSoldOutAction,
  pauseTicketTypeSalesAction,
  publishEventAction,
  resumeTicketTypeSalesAction,
  unassignDeviceFromEventAction,
  updateResourceAction,
} from "../../actions"
import {
  cancelPayoutAction,
  markPayoutFailedAction,
  markPayoutPaidAction,
  markPayoutProcessingAction,
} from "../../finance-actions"

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

  async function markSoldOut(formData: FormData) {
    "use server"
    await markTicketTypeSoldOutAction(id, formData)
  }

  async function hideTicketType(formData: FormData) {
    "use server"
    await hideTicketTypeAction(id, formData)
  }

  async function assignDevice(formData: FormData) {
    "use server"
    await assignDeviceToEventAction(id, formData)
  }

  async function unassignDevice() {
    "use server"
    await unassignDeviceFromEventAction(id)
  }

  async function markPayoutProcessing(formData: FormData) {
    "use server"
    await markPayoutProcessingAction(id, formData)
  }

  async function markPayoutPaid(formData: FormData) {
    "use server"
    await markPayoutPaidAction(id, formData)
  }

  async function markPayoutFailed(formData: FormData) {
    "use server"
    await markPayoutFailedAction(id, formData)
  }

  async function cancelPayout(formData: FormData) {
    "use server"
    await cancelPayoutAction(id, formData)
  }

  const showEventActions = resource.key === "events"
  const showTicketTypeActions = resource.key === "ticket-types"
  const showDeviceActions = resource.key === "devices"
  const showPayoutActions = resource.key === "payouts"
  const eventStatus = typeof data.status === "string" ? data.status : null
  const salesStatus = typeof data.sales_status === "string" ? data.sales_status : "on_sale"
  const payoutStatus = typeof data.status === "string" ? data.status : null
  const assignedEventId = typeof data.event_id === "string" ? data.event_id : null
  const deviceRole = typeof data.device_role === "string" ? data.device_role : null
  const isPublished = eventStatus === "published"
  const isArchived = eventStatus === "archived"
  const isPaused = salesStatus === "paused"
  const isSoldOut = salesStatus === "sold_out"
  const isHidden = salesStatus === "hidden"
  const isOnSale = salesStatus === "on_sale"
  const isPayoutProcessing = payoutStatus === "processing"
  const isPayoutPaid = payoutStatus === "paid"
  const isPayoutFailed = payoutStatus === "failed"
  const isPayoutCancelled = payoutStatus === "cancelled"

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
              Current status: <span className="font-medium">{salesStatus}</span>. These actions preserve price, quota, issued tickets and historical orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <form action={pauseSales} className="rounded-3xl border p-4">
              <p className="flex items-center gap-2 font-medium"><PauseCircle className="h-4 w-4" /> Pause sales</p>
              <p className="mt-1 text-sm text-muted-foreground">Temporarily stops new sales while keeping the ticket tier visible to admins.</p>
              <div className="mt-4 space-y-2">
                <Label htmlFor="pause-reason">Reason</Label>
                <Input id="pause-reason" name="reason" placeholder="e.g. Pricing review or sponsor hold" disabled={isPaused} />
              </div>
              <Button type="submit" variant="outline" disabled={isPaused} className="mt-4 rounded-full">
                {isPaused ? "Sales paused" : "Pause sales"}
              </Button>
            </form>

            <form action={markSoldOut} className="rounded-3xl border p-4">
              <p className="flex items-center gap-2 font-medium"><TicketX className="h-4 w-4" /> Set sold out</p>
              <p className="mt-1 text-sm text-muted-foreground">Marks the tier as sold out without changing its original quota.</p>
              <div className="mt-4 space-y-2">
                <Label htmlFor="sold-out-reason">Reason</Label>
                <Input id="sold-out-reason" name="reason" placeholder="e.g. Offline allocation exhausted" disabled={isSoldOut} />
              </div>
              <Button type="submit" variant="outline" disabled={isSoldOut} className="mt-4 rounded-full">
                {isSoldOut ? "Already sold out" : "Set sold out"}
              </Button>
            </form>

            <form action={hideTicketType} className="rounded-3xl border p-4">
              <p className="flex items-center gap-2 font-medium"><EyeOff className="h-4 w-4" /> Hide ticket type</p>
              <p className="mt-1 text-sm text-muted-foreground">Removes this tier from buyer-facing purchase flows without deleting it.</p>
              <div className="mt-4 space-y-2">
                <Label htmlFor="hide-reason">Reason</Label>
                <Input id="hide-reason" name="reason" placeholder="e.g. Internal allocation or invite-only tier" disabled={isHidden} />
              </div>
              <Button type="submit" variant="outline" disabled={isHidden} className="mt-4 rounded-full">
                {isHidden ? "Already hidden" : "Hide ticket type"}
              </Button>
            </form>

            <form action={resumeSales} className="rounded-3xl border p-4">
              <p className="flex items-center gap-2 font-medium"><PlayCircle className="h-4 w-4" /> Return to on sale</p>
              <p className="mt-1 text-sm text-muted-foreground">Makes the ticket tier available for sale again and clears temporary pause data.</p>
              <Button type="submit" disabled={isOnSale} className="mt-4 rounded-full">
                {isOnSale ? "Already on sale" : "Return to on sale"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {showDeviceActions ? (
        <Card className="mb-5 rounded-3xl border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" /> Scanner assignment</CardTitle>
            <CardDescription>
              Current role: <span className="font-medium">{deviceRole ?? "unknown"}</span>. Assigned event: <span className="font-medium">{assignedEventId ?? "none"}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <form action={assignDevice} className="rounded-3xl border p-4">
              <p className="flex items-center gap-2 font-medium"><QrCode className="h-4 w-4" /> Assign to event</p>
              <p className="mt-1 text-sm text-muted-foreground">Attach this device to an event for scanner operations. The event must belong to the same organization.</p>
              <div className="mt-4 space-y-2">
                <Label htmlFor="event_id">Event ID</Label>
                <Input id="event_id" name="event_id" placeholder="Paste event UUID" defaultValue={assignedEventId ?? ""} />
              </div>
              <Button type="submit" className="mt-4 rounded-full">Assign scanner</Button>
            </form>

            <form action={unassignDevice} className="rounded-3xl border p-4">
              <p className="flex items-center gap-2 font-medium"><Unlink className="h-4 w-4" /> Unassign from event</p>
              <p className="mt-1 text-sm text-muted-foreground">Detach this scanner from the current event and return it to unassigned scanner state.</p>
              <Button type="submit" variant="outline" disabled={!assignedEventId} className="mt-4 rounded-full">
                {assignedEventId ? "Unassign scanner" : "No event assigned"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {showPayoutActions ? (
        <Card className="mb-5 rounded-3xl border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BadgeDollarSign className="h-5 w-5" /> Payout review</CardTitle>
            <CardDescription>
              Current status: <span className="font-medium">{payoutStatus ?? "unknown"}</span>. These controls update internal review status only.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <form action={markPayoutProcessing} className="rounded-3xl border p-4">
              <p className="font-medium">Mark processing</p>
              <p className="mt-1 text-sm text-muted-foreground">Use when finance has started reviewing or preparing the payout.</p>
              <Input name="note" placeholder="Optional finance note" className="mt-4" disabled={isPayoutProcessing || isPayoutPaid} />
              <Button type="submit" variant="outline" disabled={isPayoutProcessing || isPayoutPaid} className="mt-4 rounded-full">
                {isPayoutProcessing ? "Already processing" : "Mark processing"}
              </Button>
            </form>

            <form action={markPayoutPaid} className="rounded-3xl border p-4">
              <p className="font-medium">Mark paid</p>
              <p className="mt-1 text-sm text-muted-foreground">Confirms internal status after payout settlement has been verified.</p>
              <Input name="note" placeholder="Optional settlement reference" className="mt-4" disabled={isPayoutPaid} />
              <Button type="submit" disabled={isPayoutPaid} className="mt-4 rounded-full">
                {isPayoutPaid ? "Already paid" : "Mark paid"}
              </Button>
            </form>

            <form action={markPayoutFailed} className="rounded-3xl border p-4">
              <p className="font-medium">Mark failed</p>
              <p className="mt-1 text-sm text-muted-foreground">Use when finance or the provider reports that settlement failed.</p>
              <Input name="note" placeholder="Failure reason" className="mt-4" disabled={isPayoutFailed || isPayoutPaid} />
              <Button type="submit" variant="outline" disabled={isPayoutFailed || isPayoutPaid} className="mt-4 rounded-full">
                {isPayoutFailed ? "Already failed" : "Mark failed"}
              </Button>
            </form>

            <form action={cancelPayout} className="rounded-3xl border p-4">
              <p className="font-medium">Cancel payout</p>
              <p className="mt-1 text-sm text-muted-foreground">Stops this payout request from active finance processing.</p>
              <Input name="note" placeholder="Cancellation reason" className="mt-4" disabled={isPayoutCancelled || isPayoutPaid} />
              <Button type="submit" variant="outline" disabled={isPayoutCancelled || isPayoutPaid} className="mt-4 rounded-full">
                {isPayoutCancelled ? "Already cancelled" : "Cancel payout"}
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
