import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { FormField } from "@/components/quiet/ui/form"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import { ResourceForm } from "@/components/super-admin/ResourceForm"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminResource } from "@/lib/super-admin/resources"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS, canMutateResource } from "@/lib/super-admin/permissions"
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

function ActionTile({
  icon,
  title,
  description,
  children,
}: {
  icon: IconName
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-line p-4">
      <p className="inline-flex items-center gap-2 text-[14px] font-semibold text-ink">
        <Icon name={icon} size={14} className="text-ink-3" />
        {title}
      </p>
      <p className="text-[12px] text-ink-3">{description}</p>
      {children}
    </div>
  )
}

export default async function SuperAdminEditResourcePage({
  params,
}: {
  params: Promise<{ resource: string; id: string }>
}) {
  const { roleTier } = await requireAdminRole([...ADMIN_ROLE_TIERS])
  const { resource: resourceKey, id } = await params
  const resource = getAdminResource(resourceKey)

  if (!resource) notFound()
  const activeResource = resource

  const admin = createAdminClient()
  const { data, error } = await admin
    .from(activeResource.table as any)
    .select("*")
    .eq(activeResource.primaryKey, id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) notFound()

  async function updateRecord(formData: FormData) {
    "use server"
    await updateResourceAction(activeResource.key, id, formData)
  }
  async function publishEvent() { "use server"; await publishEventAction(id) }
  async function archiveEvent(formData: FormData) { "use server"; await archiveEventAction(id, formData) }
  async function pauseSales(formData: FormData) { "use server"; await pauseTicketTypeSalesAction(id, formData) }
  async function resumeSales() { "use server"; await resumeTicketTypeSalesAction(id) }
  async function markSoldOut(formData: FormData) { "use server"; await markTicketTypeSoldOutAction(id, formData) }
  async function hideTicketType(formData: FormData) { "use server"; await hideTicketTypeAction(id, formData) }
  async function assignDevice(formData: FormData) { "use server"; await assignDeviceToEventAction(id, formData) }
  async function unassignDevice() { "use server"; await unassignDeviceFromEventAction(id) }
  async function markPayoutProcessing(formData: FormData) { "use server"; await markPayoutProcessingAction(id, formData) }
  async function markPayoutPaid(formData: FormData) { "use server"; await markPayoutPaidAction(id, formData) }
  async function markPayoutFailed(formData: FormData) { "use server"; await markPayoutFailedAction(id, formData) }
  async function cancelPayout(formData: FormData) { "use server"; await cancelPayoutAction(id, formData) }

  const canMutate = canMutateResource(resource.key, roleTier)
  const canUseBusinessActions = roleTier !== "read_only_admin"
  const showEventActions = canUseBusinessActions && resource.key === "events"
  const showTicketTypeActions = canUseBusinessActions && resource.key === "ticket-types"
  const showDeviceActions = canUseBusinessActions && resource.key === "devices"
  const showPayoutActions = canUseBusinessActions && resource.key === "payouts"
  const rec = data as { status?: unknown; sales_status?: unknown; event_id?: unknown; device_role?: unknown }
  const eventStatus = typeof rec.status === "string" ? rec.status : null
  const salesStatus = typeof rec.sales_status === "string" ? rec.sales_status : "on_sale"
  const payoutStatus = typeof rec.status === "string" ? rec.status : null
  const assignedEventId = typeof rec.event_id === "string" ? rec.event_id : null
  const deviceRole = typeof rec.device_role === "string" ? rec.device_role : null
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
      <Link
        href={`/super-admin/${resource.key}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
      >
        <Icon name="chevL" size={14} />
        Back to {resource.label}
      </Link>

      {!canMutate ? (
        <div className="mb-5 flex items-start gap-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-ink-2">
          <Icon name="bell" size={14} className="mt-0.5 shrink-0 text-warning" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-ink">Raw edit access is disabled for this resource.</p>
            <p>
              This record can be reviewed, but direct table edits are reserved for higher admin tiers. Finance users should use audited finance workflow actions where available.
            </p>
          </div>
        </div>
      ) : null}

      {showEventActions ? (
        <Card className="mb-5 border-accent/30">
          <CardBody className="flex flex-col gap-1 px-5 py-4">
            <p className="inline-flex items-center gap-2 text-h3">
              <Icon name="zap" size={16} className="text-ink-3" />
              Event business actions
            </p>
            <p className="text-[12px] text-ink-3">
              Publish validates required event readiness. Archive removes the event from active operations and records the reason.
            </p>
          </CardBody>
          <CardDivider />
          <CardBody className="grid gap-4 p-5 md:grid-cols-2">
            <form action={publishEvent}>
              <ActionTile icon="zap" title="Publish event" description="Runs readiness checks, updates status and writes an audit entry.">
                <Button type="submit" disabled={isPublished || isArchived} variant="primary" size="md" block>
                  {isPublished ? "Already published" : isArchived ? "Archived" : "Publish event"}
                </Button>
              </ActionTile>
            </form>

            <form action={archiveEvent}>
              <ActionTile icon="trash" title="Archive event" description="Moves this event out of active circulation and captures an audit reason.">
                <FormField label="Reason" name="reason" placeholder="e.g. Event completed or cancelled" disabled={isArchived} />
                <Button type="submit" disabled={isArchived} variant="outline" size="md" block>
                  {isArchived ? "Already archived" : "Archive event"}
                </Button>
              </ActionTile>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {showTicketTypeActions ? (
        <Card className="mb-5 border-accent/30">
          <CardBody className="flex flex-col gap-1 px-5 py-4">
            <p className="inline-flex items-center gap-2 text-h3">
              <Icon name="ticket" size={16} className="text-ink-3" />
              Ticket sales actions
            </p>
            <p className="text-[12px] text-ink-3">
              Current status · <span className="font-semibold text-ink">{salesStatus}</span>. These actions preserve price, quota, issued tickets and historical orders.
            </p>
          </CardBody>
          <CardDivider />
          <CardBody className="grid gap-4 p-5 md:grid-cols-2">
            <form action={pauseSales}>
              <ActionTile icon="minus" title="Pause sales" description="Temporarily stops new sales while keeping the ticket tier visible to admins.">
                <FormField label="Reason" name="reason" placeholder="e.g. Pricing review or sponsor hold" disabled={isPaused} />
                <Button type="submit" disabled={isPaused} variant="outline" size="md" block>
                  {isPaused ? "Sales paused" : "Pause sales"}
                </Button>
              </ActionTile>
            </form>

            <form action={markSoldOut}>
              <ActionTile icon="close" title="Set sold out" description="Marks the tier as sold out without changing its original quota.">
                <FormField label="Reason" name="reason" placeholder="e.g. Offline allocation exhausted" disabled={isSoldOut} />
                <Button type="submit" disabled={isSoldOut} variant="outline" size="md" block>
                  {isSoldOut ? "Already sold out" : "Set sold out"}
                </Button>
              </ActionTile>
            </form>

            <form action={hideTicketType}>
              <ActionTile icon="close" title="Hide ticket type" description="Removes this tier from buyer-facing purchase flows without deleting it.">
                <FormField label="Reason" name="reason" placeholder="e.g. Internal allocation or invite-only tier" disabled={isHidden} />
                <Button type="submit" disabled={isHidden} variant="outline" size="md" block>
                  {isHidden ? "Already hidden" : "Hide ticket type"}
                </Button>
              </ActionTile>
            </form>

            <form action={resumeSales}>
              <ActionTile icon="check" title="Return to on sale" description="Makes the ticket tier available for sale again and clears temporary pause data.">
                <Button type="submit" disabled={isOnSale} variant="primary" size="md" block>
                  {isOnSale ? "Already on sale" : "Return to on sale"}
                </Button>
              </ActionTile>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {showDeviceActions ? (
        <Card className="mb-5 border-accent/30">
          <CardBody className="flex flex-col gap-1 px-5 py-4">
            <p className="inline-flex items-center gap-2 text-h3">
              <Icon name="qr" size={16} className="text-ink-3" />
              Scanner assignment
            </p>
            <p className="text-[12px] text-ink-3">
              Current role · <span className="font-semibold text-ink">{deviceRole ?? "unknown"}</span>. Assigned event · <span className="font-semibold text-ink">{assignedEventId ?? "none"}</span>.
            </p>
          </CardBody>
          <CardDivider />
          <CardBody className="grid gap-4 p-5 md:grid-cols-2">
            <form action={assignDevice}>
              <ActionTile icon="qr" title="Assign to event" description="Attach this device to an event for scanner operations. The event must belong to the same organization.">
                <FormField label="Event ID" name="event_id" placeholder="Paste event UUID" defaultValue={assignedEventId ?? ""} />
                <Button type="submit" variant="primary" size="md" block>Assign scanner</Button>
              </ActionTile>
            </form>

            <form action={unassignDevice}>
              <ActionTile icon="close" title="Unassign from event" description="Detach this scanner from the current event and return it to unassigned scanner state.">
                <Button type="submit" disabled={!assignedEventId} variant="outline" size="md" block>
                  {assignedEventId ? "Unassign scanner" : "No event assigned"}
                </Button>
              </ActionTile>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {showPayoutActions ? (
        <Card className="mb-5 border-accent/30">
          <CardBody className="flex flex-col gap-1 px-5 py-4">
            <p className="inline-flex items-center gap-2 text-h3">
              <Icon name="wallet" size={16} className="text-ink-3" />
              Payout review
            </p>
            <p className="text-[12px] text-ink-3">
              Current status · <span className="font-semibold text-ink">{payoutStatus ?? "unknown"}</span>. These controls update internal review status only.
            </p>
          </CardBody>
          <CardDivider />
          <CardBody className="grid gap-4 p-5 md:grid-cols-2">
            <form action={markPayoutProcessing}>
              <ActionTile icon="clock" title="Mark processing" description="Use when finance has started reviewing or preparing the payout.">
                <FormField label="Note" name="note" placeholder="Optional finance note" disabled={isPayoutProcessing || isPayoutPaid} />
                <Button type="submit" disabled={isPayoutProcessing || isPayoutPaid} variant="outline" size="md" block>
                  {isPayoutProcessing ? "Already processing" : "Mark processing"}
                </Button>
              </ActionTile>
            </form>
            <form action={markPayoutPaid}>
              <ActionTile icon="check" title="Mark paid" description="Confirms internal status after payout settlement has been verified.">
                <FormField label="Note" name="note" placeholder="Optional settlement reference" disabled={isPayoutPaid} />
                <Button type="submit" disabled={isPayoutPaid} variant="primary" size="md" block>
                  {isPayoutPaid ? "Already paid" : "Mark paid"}
                </Button>
              </ActionTile>
            </form>
            <form action={markPayoutFailed}>
              <ActionTile icon="close" title="Mark failed" description="Use when finance or the provider reports that settlement failed.">
                <FormField label="Note" name="note" placeholder="Failure reason" disabled={isPayoutFailed || isPayoutPaid} />
                <Button type="submit" disabled={isPayoutFailed || isPayoutPaid} variant="outline" size="md" block>
                  {isPayoutFailed ? "Already failed" : "Mark failed"}
                </Button>
              </ActionTile>
            </form>
            <form action={cancelPayout}>
              <ActionTile icon="close" title="Cancel payout" description="Stops this payout request from active finance processing.">
                <FormField label="Note" name="note" placeholder="Cancellation reason" disabled={isPayoutCancelled || isPayoutPaid} />
                <Button type="submit" disabled={isPayoutCancelled || isPayoutPaid} variant="outline" size="md" block>
                  {isPayoutCancelled ? "Already cancelled" : "Cancel payout"}
                </Button>
              </ActionTile>
            </form>
          </CardBody>
        </Card>
      ) : null}

      {canMutate ? (
        <Card>
          <CardBody className="px-5 py-4">
            <p className="text-h3">Edit {resource.label}</p>
          </CardBody>
          <CardDivider />
          <CardBody className="p-5">
            <ResourceForm
              resource={resource}
              record={data as unknown as Record<string, unknown> | null}
              action={updateRecord}
              submitLabel="Save changes"
            />
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="flex flex-col gap-1 px-5 py-4">
            <p className="text-h3">{resource.label} record</p>
            <p className="text-[12px] text-ink-3">Direct editing is hidden for your admin tier.</p>
          </CardBody>
          <CardDivider />
          <CardBody className="p-5">
            <pre className="overflow-x-auto rounded-[var(--radius-md)] bg-bg p-4 font-mono text-[11px] text-ink-3">
              {JSON.stringify(data, null, 2)}
            </pre>
          </CardBody>
        </Card>
      )}
    </main>
  )
}
