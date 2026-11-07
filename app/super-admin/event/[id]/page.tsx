import Link from "next/link"
import { notFound } from "next/navigation"

import { addNoteAction, hideEventUpdateAction, pauseSalesAction, resumeSalesAction } from "@/app/super-admin/console-actions"
import { Crumbs, Facts, NotesList, Panel, Pill, when, type Tone } from "@/components/super-admin/console-ui"
import { GuardedAction, NoteForm } from "@/components/super-admin/GuardedAction"
import { humanFailureReason } from "@/lib/data/admin/console"
import { getEvent360 } from "@/lib/data/admin/console-ops"
import { getAdminContext, requireSuperAdmin } from "@/lib/super-admin/auth"
import { canDo, formatMoney, orderRef } from "@/lib/super-admin/console"

export const metadata = { title: "Event · Admin" }

const STATUS_TONE: Record<string, Tone> = { published: "success", draft: "muted", paused: "warning", archived: "muted" }
const SALES_LABEL: Record<string, string> = { on_sale: "On sale", paused: "Paused", sold_out: "Sold out", hidden: "Hidden" }

export default async function AdminEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin()
  const { id } = await params
  const [event, context] = await Promise.all([getEvent360(id), getAdminContext()])
  if (!event) notFound()
  const role = context?.role ?? null
  const salesLock = canDo("pause_sales", role) ? undefined : "Your role can't change sales"
  const offline = event.devices.filter((d) => d.offline).length

  return (
    <div className="flex flex-col gap-5">
      <Crumbs items={[{ label: "Search", href: "/super-admin/search" }, { label: event.title }]} />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{event.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Pill tone={STATUS_TONE[event.status] ?? "muted"}>{event.status}</Pill>
            {offline ? <Pill tone="danger">{offline} scanner{offline === 1 ? "" : "s"} offline</Pill> : null}
            {event.paymentErrors.length ? <Pill tone="warning">Recent payment errors</Pill> : null}
            {event.pendingRefunds ? <Pill tone="warning">{event.pendingRefunds} refund{event.pendingRefunds === 1 ? "" : "s"} waiting</Pill> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-[13px]">
          {event.slug ? (
            <Link href={`/events/${event.slug}`} className="text-accent hover:underline">
              Public page
            </Link>
          ) : null}
          <Link href={`/super-admin/events/${event.id}?raw=1`} className="text-accent hover:underline">
            Raw record
          </Link>
        </div>
      </header>

      <Facts
        items={[
          {
            label: "Organizer",
            value: event.org ? (
              <Link href={`/super-admin/organizer/${event.org.id}`} className="text-accent hover:underline">
                {event.org.name}
              </Link>
            ) : (
              "None"
            ),
          },
          { label: "When", value: when(event.startsAt), sub: [event.endsAt ? `until ${when(event.endsAt)}` : null, event.city].filter(Boolean).join(" · ") || undefined },
          { label: "Tickets sold", value: event.issued.toLocaleString("en-SZ"), sub: `${event.checkedIn.toLocaleString("en-SZ")} scanned in` },
          { label: "Door team", value: `${event.staffCount} staff`, sub: `${event.devices.length} scanner${event.devices.length === 1 ? "" : "s"} assigned` },
        ]}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Ticket types" aside="Pausing asks why and is logged">
            <ul className="flex flex-col">
              {event.ticketTypes.map((type) => (
                <li key={type.id} className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="min-w-0 flex-1 basis-48 text-sm font-semibold text-ink">
                      {type.name} <span className="font-normal text-ink-3">· {formatMoney(type.priceCents, type.currency)}</span>
                    </span>
                    <span className="text-[13px] tabular-nums text-ink-3">
                      {type.sold.toLocaleString("en-SZ")}
                      {type.quota ? ` of ${type.quota.toLocaleString("en-SZ")}` : ""} sold
                    </span>
                    <Pill tone={type.salesStatus === "on_sale" ? "success" : type.salesStatus === "paused" ? "warning" : "muted"}>
                      {SALES_LABEL[type.salesStatus] ?? type.salesStatus}
                    </Pill>
                  </div>
                  {type.salesStatus === "paused" && type.pauseReason ? <p className="text-xs text-ink-3">Paused because: {type.pauseReason}</p> : null}
                  {type.salesStatus === "on_sale" ? (
                    <GuardedAction
                      label="Pause sales"
                      hint="Stops new purchases of this ticket type"
                      action={pauseSalesAction}
                      hidden={{ ticketTypeId: type.id }}
                      lockedReason={salesLock}
                      explain="Existing tickets stay valid. Buyers see this type as unavailable until you resume."
                    />
                  ) : type.salesStatus === "paused" ? (
                    <GuardedAction
                      label="Resume sales"
                      hint="Puts it back on sale"
                      action={resumeSalesAction}
                      hidden={{ ticketTypeId: type.id }}
                      lockedReason={salesLock}
                    />
                  ) : null}
                </li>
              ))}
              {event.ticketTypes.length === 0 ? <li className="text-[13px] text-ink-3">No ticket types yet.</li> : null}
            </ul>
          </Panel>

          <Panel
            title="Attendee guide"
            aside={`${event.guide.filled} of ${event.guide.total} essentials`}
          >
            <div className="flex flex-col gap-3 text-[13px]">
              <p className="text-ink-2">
                {event.guide.missing.length
                  ? `Missing: ${event.guide.missing.join(", ")}. Ticket holders see what is filled in.`
                  : "Complete. Ticket holders have entry, directions, the running order and a help contact."}
                {event.guide.updatedAt ? <span className="text-ink-3"> Last edited {when(event.guide.updatedAt)}.</span> : null}
              </p>
              {event.updates.length ? (
                <ul className="flex flex-col">
                  {event.updates.map((update) => (
                    <li key={update.id} className="flex flex-col gap-2 border-t border-line py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className={"font-semibold " + (update.hiddenAt ? "text-ink-3 line-through" : "text-ink")}>{update.title}</span>
                        <span className="text-xs text-ink-3">
                          {when(update.createdAt)}
                          {update.notified ? " · notified holders" : ""}
                        </span>
                      </div>
                      {update.body ? <p className="text-ink-2">{update.body}</p> : null}
                      {update.hiddenAt ? (
                        <p className="text-xs text-ink-3">Hidden {when(update.hiddenAt)}: {update.hiddenReason}</p>
                      ) : (
                        <GuardedAction
                          label="Hide this update"
                          hint="Ticket holders stop seeing it"
                          action={hideEventUpdateAction}
                          hidden={{ updateId: update.id }}
                          lockedReason={canDo("hide_event_update", role) ? undefined : "Support, event ops or the owner can hide updates."}
                          explain="The organiser still sees it, marked hidden with your reason."
                        />
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-3">No updates posted.</p>
              )}
            </div>
          </Panel>

          {event.paymentErrors.length ? (
            <Panel title="Recent payment errors">
              <ul className="flex flex-col gap-2 text-[13px]">
                {event.paymentErrors.map((err) => (
                  <li key={err.ref} className="flex flex-wrap justify-between gap-2">
                    <span>
                      <strong>{err.ref}</strong> · {humanFailureReason(err.reason)}
                    </span>
                    <span className="text-ink-3">
                      {err.orderId ? (
                        <Link href={`/super-admin/order/${err.orderId}`} className="text-accent hover:underline">
                          Order {orderRef(err.orderId)}
                        </Link>
                      ) : null}{" "}
                      {when(err.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <Panel title="Scanners">
            {event.devices.length ? (
              <ul className="flex flex-col gap-2 text-[13px]">
                {event.devices.map((device) => (
                  <li key={device.id} className="flex items-center justify-between gap-2">
                    <span>{device.label ?? "Unnamed scanner"}</span>
                    <Pill tone={device.offline ? "danger" : "success"}>{device.offline ? `offline · ${when(device.lastSeenAt)}` : "online"}</Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-3">No scanners assigned. Staff can still scan with the organizer app.</p>
            )}
          </Panel>

          <Panel title="Door team" aside={`${event.staffCount} active`}>
            {event.staff.length ? (
              <ul className="flex flex-col gap-2 text-[13px]">
                {event.staff.map((member) => (
                  <li key={member.userId} className="flex items-center justify-between gap-2">
                    <Link href={`/super-admin/people/${member.userId}`} className="min-w-0 truncate text-ink hover:text-accent hover:underline">
                      {member.email ?? "Staff member"}
                    </Link>
                    <Pill tone={member.active ? "muted" : "warning"}>
                      {member.role.replace(/_/g, " ")}
                      {member.active ? "" : " · removed"}
                    </Pill>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-3">No one is on the door team yet. The organizer adds staff from their event page.</p>
            )}
          </Panel>

          <Panel title="Internal notes">
            <div className="flex flex-col gap-3">
              <NotesList notes={event.notes} />
              {canDo("add_note", role) ? <NoteForm action={addNoteAction} subjectType="event" subjectId={event.id} /> : null}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  )
}
