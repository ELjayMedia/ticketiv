'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { Card, CardBody, CardDivider } from '@/components/quiet/ui/card'
import { Button } from '@/components/quiet/ui/button'
import { Chip } from '@/components/quiet/ui/chip'
import { Icon } from '@/components/quiet/ui/icon'
import { LineupStep } from '@/components/event-wizard/steps/LineupStep'
import { PoliciesStep } from '@/components/event-wizard/steps/PoliciesStep'
import { FinishSetupNudge } from '@/components/event-management/finish-setup-nudge'
import { GuestlistTab } from '@/components/event-management/guestlist-tab'
import { TicketSalesBreakdown } from '@/components/event-management/ticket-sales-breakdown'
import { useEventLiveStats } from '@/lib/hooks/use-event-live-stats'

interface EventManagementTabsProps {
  eventId: string
  orgId: string
  event: {
    id: string
    title: string
    date: string
    status: string
  }
}

type OpsState = {
  metrics?: {
    staff_count?: number
    scans_count?: number
    guestlist_count?: number
    issued_tickets?: number
    checked_in_tickets?: number
  }
  publishEligible?: boolean
}

type TicketType = {
  id: string
  name: string
  price_cents: number
  currency: string
  quota: number
  per_user_limit: number | null
  is_reserved_seating: boolean | null
  sales_status: 'on_sale' | 'paused' | 'sold_out' | 'hidden'
  sales_pause_reason: string | null
  reserved_count: number
  available_count: number
  sold_out: boolean
}

type TicketTypesState = {
  tickets?: TicketType[]
  error?: string
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat('en-SZ', {
    style: 'currency',
    currency: currency || 'SZL',
    maximumFractionDigits: 2,
  }).format((cents ?? 0) / 100)
}

function ticketStatusChip(status: TicketType['sales_status'], soldOut: boolean) {
  const label = soldOut || status === 'sold_out' ? 'Sold out' : status.replaceAll('_', ' ')
  const variant =
    soldOut || status === 'sold_out'
      ? 'danger'
      : status === 'on_sale'
        ? 'accent'
        : 'muted'
  return { label, variant } as const
}

// Shared link-button style — mirrors Button variant="outline"
const linkBtn =
  'inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap ' +
  'rounded-[var(--radius)] leading-none transition-colors duration-150 ' +
  'bg-transparent text-ink border border-line-2 hover:bg-bg px-4 py-2.5 text-sm'

function TicketTypesTab({ orgId, eventId }: { orgId: string; eventId: string }) {
  const [state, setState] = useState<TicketTypesState | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadTickets() {
      const response = await fetch(`/api/events/${eventId}/ticket-types`, { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (cancelled) return
      if (!response.ok) setState({ error: payload.error ?? 'Unable to load ticket types' })
      else setState({ tickets: payload.tickets ?? [] })
    }
    loadTickets()
    return () => { cancelled = true }
  }, [eventId])

  const tickets = state?.tickets ?? []
  const totalQuota = tickets.reduce((sum, t) => sum + (t.quota ?? 0), 0)
  const totalReserved = tickets.reduce((sum, t) => sum + (t.reserved_count ?? 0), 0)
  const totalAvailable = tickets.reduce((sum, t) => sum + (t.available_count ?? 0), 0)

  return (
    <Card>
      <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-0">
        <div>
          <h3 className="text-h3">Ticket Types</h3>
          <p className="mt-0.5 text-sm text-ink-3">Review ticket tiers, quotas, availability and sales status.</p>
        </div>
        <Link href={`/orgs/${orgId}/events/${eventId}/edit?step=tickets`} className={linkBtn}>
          Manage tickets
        </Link>
      </CardBody>

      <CardBody className="space-y-5 pt-4">
        {state?.error && (
          <div className="rounded-[var(--radius)] border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
            {state.error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Total quota', value: totalQuota },
            { label: 'Reserved / sold', value: totalReserved },
            { label: 'Available', value: totalAvailable },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-[var(--radius)] border border-line bg-bg p-4">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</p>
              <p className="font-mono text-[22px] font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {!state && <p className="text-sm text-ink-3">Loading ticket types…</p>}

        {state && tickets.length === 0 && !state.error && (
          <div className="flex flex-col items-center py-8 gap-3 text-ink-3">
            <Icon name="ticket" size={32} />
            <p className="text-sm">No ticket types configured yet</p>
            <Link href={`/orgs/${orgId}/events/${eventId}/edit?step=tickets`} className={linkBtn}>
              Add Tickets
            </Link>
          </div>
        )}

        {tickets.length > 0 && (
          <div className="space-y-3">
            {tickets.map((ticket) => {
              const { label, variant } = ticketStatusChip(ticket.sales_status, ticket.sold_out)
              return (
                <div key={ticket.id} className="rounded-[var(--radius)] border border-line p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold">{ticket.name}</h4>
                        <Chip
                          size="sm"
                          variant={variant === 'danger' ? 'muted' : variant}
                          className={variant === 'danger' ? 'border-danger/30 bg-danger-soft text-danger' : undefined}
                        >
                          {label}
                        </Chip>
                        {ticket.is_reserved_seating && (
                          <Chip size="sm" variant="default">Reserved seating</Chip>
                        )}
                      </div>
                      {ticket.sales_pause_reason && (
                        <p className="mt-1 text-xs text-ink-3">Reason: {ticket.sales_pause_reason}</p>
                      )}
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-mono text-[18px] font-semibold tabular-nums">
                        {formatMoney(ticket.price_cents, ticket.currency)}
                      </p>
                      <p className="text-xs text-ink-3">Limit {ticket.per_user_limit ?? '—'} per buyer</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: 'Quota', value: ticket.quota },
                      { label: 'Reserved / sold', value: ticket.reserved_count },
                      { label: 'Available', value: ticket.available_count },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-ink-3">{label}</p>
                        <p className="font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function OperationsTab({ orgId, eventId }: { orgId: string; eventId: string }) {
  const [ops, setOps] = useState<OpsState | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadOps() {
      const response = await fetch(`/api/events/${eventId}/ops`, { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!cancelled && response.ok) setOps(payload)
    }
    loadOps()
    return () => { cancelled = true }
  }, [eventId])

  const metrics = ops?.metrics

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Event staff',
            value: metrics?.staff_count ?? 0,
            sub: 'People assigned to run check-in',
          },
          {
            label: 'Scans captured',
            value: metrics?.scans_count ?? 0,
            sub: 'Valid and invalid scan attempts logged',
          },
          {
            label: 'Guestlist entries',
            value: metrics?.guestlist_count ?? 0,
            sub: 'Complimentary or controlled access entries',
          },
        ].map(({ label, value, sub }) => (
          <Card key={label}>
            <CardBody>
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</p>
              <p className="font-mono text-[22px] font-semibold tabular-nums">{value}</p>
              <p className="mt-1 text-xs text-ink-3">{sub}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody>
          <h3 className="text-h3">Operations checklist</h3>
          <p className="mt-0.5 text-sm text-ink-3">Prepare the event-day operating setup after publishing.</p>
        </CardBody>
        <CardDivider />
        <CardBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius)] border border-line p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Check-in team</p>
                  <p className="mt-0.5 text-sm text-ink-3">Add scanners and gate staff for this event.</p>
                </div>
                <Chip size="sm" variant={(metrics?.staff_count ?? 0) > 0 ? 'accent' : 'muted'}>
                  {(metrics?.staff_count ?? 0) > 0 ? 'Ready' : 'Pending'}
                </Chip>
              </div>
              <Link
                href={`/orgs/${orgId}/events/${eventId}/staff`}
                className={cn(linkBtn, 'mt-4 w-full')}
              >
                <Icon name="users" size={16} /> Manage staff
              </Link>
            </div>

            <div className="rounded-[var(--radius)] border border-line p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Scanner readiness</p>
                  <p className="mt-0.5 text-sm text-ink-3">Open the scanner and test one issued ticket before doors open.</p>
                </div>
                <Chip size="sm" variant="default">Manual test</Chip>
              </div>
              <Link
                href={`/orgs/${orgId}/events/${eventId}/scanner`}
                className={cn(linkBtn, 'mt-4 w-full')}
              >
                <Icon name="qr" size={16} /> Open scanner
              </Link>
            </div>
          </div>

          <div className="rounded-[var(--radius)] bg-surface-2 p-4 text-sm text-ink-3">
            Operations no longer block publishing. Use this tab after the event is live to prepare staff, scanning and guestlist workflows.
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

const TABS = [
  { value: 'overview', label: 'Overview', icon: 'trending' },
  { value: 'checkin', label: 'Check-in', icon: 'qr' },
  { value: 'tickets', label: 'Tickets', icon: 'ticket' },
  { value: 'guestlist', label: 'Guestlist', icon: 'users' },
  { value: 'lineup', label: 'Lineup', icon: 'music' },
  { value: 'policies', label: 'Policies', icon: 'fileText' },
  { value: 'operations', label: 'Operations', icon: 'settings' },
  { value: 'staff', label: 'Staff', icon: 'users' },
  { value: 'payouts', label: 'Payouts', icon: 'wallet' },
] as const

export function EventManagementTabs({ eventId, orgId, event }: EventManagementTabsProps) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const tab = searchParams?.get('tab') ?? 'overview'

  const dismissKey = `ticketiv:event-setup-dismissed:${eventId}`
  const [nudgeDismissed, setNudgeDismissed] = useState(true)

  const { stats: liveStats, status: liveStatus } = useEventLiveStats(eventId)

  useEffect(() => {
    setNudgeDismissed(window.localStorage.getItem(dismissKey) === '1')
  }, [dismissKey])

  const dismissNudge = useCallback(() => {
    window.localStorage.setItem(dismissKey, '1')
    setNudgeDismissed(true)
  }, [dismissKey])

  function changeTab(next: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (next === 'overview') params.delete('tab')
    else params.set('tab', next)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <div className="w-full space-y-6">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-line">
        {TABS.map(({ value, label, icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => changeTab(value)}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap',
              'border-b-2 -mb-px transition-colors duration-150',
              tab === value
                ? 'border-ink text-ink'
                : 'border-transparent text-ink-3 hover:text-ink-2',
            )}
          >
            <Icon name={icon} size={16} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <FinishSetupNudge eventId={eventId} dismissed={nudgeDismissed} onDismiss={dismissNudge} />
          <TicketSalesBreakdown eventId={eventId} />

          {/* Live KPI bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Tickets Sold',
                value: liveStats?.tickets_sold?.toLocaleString() ?? '—',
              },
              {
                label: 'Available',
                value: liveStats?.tickets_available?.toLocaleString() ?? '—',
              },
              {
                label: 'Revenue',
                value:
                  liveStats?.gross_sales_cents != null
                    ? (liveStats.gross_sales_cents / 100).toLocaleString('en-SZ', {
                        minimumFractionDigits: 2,
                      })
                    : '—',
                prefix: liveStats?.gross_sales_cents != null ? 'SZL' : undefined,
              },
              {
                label: 'Checked In',
                value: liveStats?.checked_in_count?.toLocaleString() ?? '—',
              },
            ].map(({ label, value, prefix }) => (
              <Card key={label}>
                <CardBody>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</p>
                    {liveStatus === 'subscribed' && (
                      <span className="h-1.5 w-1.5 rounded-full bg-success" title="Live" />
                    )}
                  </div>
                  <p className="font-mono text-[22px] font-semibold tabular-nums">
                    {prefix && <span className="mr-1 text-[13px] text-ink-3">{prefix}</span>}
                    {value}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Status</p>
                  <div className="mt-1.5">
                    <Chip
                      size="sm"
                      variant={event.status === 'published' ? 'active' : 'muted'}
                      className="capitalize"
                    >
                      {event.status}
                    </Chip>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Event Date</p>
                  <p className="mt-1.5 text-[15px] font-semibold">{event.date}</p>
                </div>
              </div>
            </CardBody>
            <CardDivider />
            <CardBody>
              <h3 className="font-semibold text-ink mb-1">{event.title}</h3>
              <div className="flex gap-3 mt-3">
                <Link href={`/orgs/${orgId}/events/${eventId}/edit`} className={linkBtn}>
                  Edit Event
                </Link>
                <Link href={`/events/${eventId}`} className={linkBtn}>
                  <Icon name="arrowUR" size={16} /> View Public Page
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Check-in Tab */}
      {tab === 'checkin' && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 mb-1">
              <Icon name="qr" size={20} />
              <h3 className="text-h3">Scan & Check-in</h3>
            </div>
            <p className="text-sm text-ink-3 mb-4">Start checking in attendees using QR code scanner</p>
            <Link href={`/orgs/${orgId}/events/${eventId}/scanner`} className={cn(linkBtn, 'w-full justify-center')}>
              <Icon name="qr" size={18} /> Open Scanner
            </Link>
          </CardBody>
        </Card>
      )}

      {/* Tickets Tab */}
      {tab === 'tickets' && <TicketTypesTab orgId={orgId} eventId={eventId} />}

      {/* Guestlist Tab */}
      {tab === 'guestlist' && <GuestlistTab eventId={eventId} />}

      {/* Lineup Tab */}
      {tab === 'lineup' && (
        <Card>
          <CardBody>
            <h3 className="text-h3">Lineup</h3>
            <p className="mt-0.5 text-sm text-ink-3 mb-4">Add performers, speakers and featured guests for this event</p>
            <LineupStep eventId={eventId} onSaving={dismissNudge} />
          </CardBody>
        </Card>
      )}

      {/* Policies Tab */}
      {tab === 'policies' && (
        <Card>
          <CardBody>
            <h3 className="text-h3">Policies</h3>
            <p className="mt-0.5 text-sm text-ink-3 mb-4">Refund policy, attendee fields and confirmation messaging</p>
            <PoliciesStep eventId={eventId} onSaving={dismissNudge} />
          </CardBody>
        </Card>
      )}

      {/* Operations Tab */}
      {tab === 'operations' && <OperationsTab orgId={orgId} eventId={eventId} />}

      {/* Staff Tab */}
      {tab === 'staff' && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 mb-1">
              <Icon name="users" size={20} />
              <h3 className="text-h3">Event Staff</h3>
            </div>
            <p className="text-sm text-ink-3 mb-4">Manage scanners and event staff who can check in attendees</p>
            <Link href={`/orgs/${orgId}/events/${eventId}/staff`} className={linkBtn}>
              <Icon name="users" size={16} /> Manage staff
            </Link>
          </CardBody>
        </Card>
      )}

      {/* Payouts Tab */}
      {tab === 'payouts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Available Balance', value: '0.00' },
              { label: 'Pending Payouts', value: '0.00' },
              { label: 'Paid Out', value: '0.00' },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardBody>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</p>
                  <p className="font-mono text-[22px] font-semibold tabular-nums">
                    <span className="mr-1 text-[13px] text-ink-3">SZL</span>
                    {value}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>

          <Card>
            <CardBody>
              <h3 className="text-h3">Payout History</h3>
              <p className="mt-0.5 text-sm text-ink-3">Request and track your payouts</p>
            </CardBody>
            <CardDivider />
            <CardBody>
              <div className="flex flex-col items-center py-8 gap-3 text-ink-3">
                <Icon name="wallet" size={32} />
                <p className="text-sm">No payouts yet</p>
                <Button disabled>Request Payout</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
