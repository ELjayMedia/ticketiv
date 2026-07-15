import Link from "next/link"

import { TapBandLostAction } from "@/components/quiet/screens/profile/tapband-lost-action"
import { Card } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import type {
  MyTapBandProfile,
  TapBandCredentialCard,
  TapBandStatusTone,
  TapBandTicketLink,
} from "@/lib/data/attendee/tapband"

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

const DATE_TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

export function TapBandSection({ profile }: { profile?: MyTapBandProfile | null }) {
  if (!profile) return null

  const primary = profile.activeCredential ?? profile.credentials.find((card) => card.status === "issued") ?? null
  const history = profile.credentials.filter((card) => card.credentialId !== primary?.credentialId)
  const tickets = profile.eligibleTickets.slice(0, 3)

  return (
    <section className="px-5 pb-4">
      <div className="text-label mb-2">TapBand</div>
      <Card className="p-0">
        {primary ? (
          <div className="flex flex-col gap-3 p-3.5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon name="zap" size={17} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-[14px] font-semibold text-ink">{primary.safeLabel}</h2>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-ink-3">
                      {primary.serialSuffix ? `Band suffix ${primary.serialSuffix}` : "Physical credential"}
                    </p>
                  </div>
                  <StatusBadge tone={primary.statusTone}>{primary.statusLabel}</StatusBadge>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <MetaPill label="Activated" value={formatDate(primary.activatedAt) ?? "Not yet"} />
                  <MetaPill label="Last used" value={formatDateTime(primary.lastUsedAt) ?? "No taps yet"} />
                </div>
              </div>
            </div>

            <InfoRows />

            {tickets.length > 0 && (
              <div className="rounded-[var(--radius)] border border-line bg-bg/60">
                {tickets.map((ticket, index) => (
                  <TicketRow key={ticket.orderItemId} ticket={ticket} border={index > 0} />
                ))}
              </div>
            )}

            {tickets.length === 0 && (
              <div className="rounded-[var(--radius)] border border-line bg-bg/60 px-3 py-2.5">
                <p className="text-[12px] leading-relaxed text-ink-3">
                  No upcoming tickets are assigned to this TapBand right now. Your QR tickets remain available.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <Link
                href={profile.supportHref}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent hover:underline"
              >
                Activation and replacement
                <Icon name="chevR" size={12} />
              </Link>
              {primary.canReportLost && <TapBandLostAction credentialId={primary.credentialId} />}
            </div>
          </div>
        ) : (
          <EmptyTapBand supportHref={profile.supportHref} />
        )}

        {history.length > 0 && (
          <details className="border-t border-line">
            <summary className="flex cursor-pointer items-center justify-between px-3.5 py-3 text-[13px] font-semibold text-ink">
              <span>History</span>
              <span className="font-mono text-[10px] uppercase text-ink-3">{history.length} saved</span>
            </summary>
            <div className="border-t border-line">
              {history.map((credential, index) => (
                <HistoryRow
                  key={credential.credentialId}
                  credential={credential}
                  border={index > 0}
                />
              ))}
            </div>
          </details>
        )}
      </Card>
    </section>
  )
}

function EmptyTapBand({ supportHref }: { supportHref: string }) {
  return (
    <div className="flex flex-col gap-3 p-3.5">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon name="qr" size={17} />
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <h2 className="text-[14px] font-semibold text-ink">No TapBand linked</h2>
          <p className="text-[12px] leading-relaxed text-ink-3">
            QR tickets work as usual. A supported outlet can activate a TapBand or help with replacements.
          </p>
        </div>
      </div>
      <Link
        href={supportHref}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[13px] font-semibold text-ink hover:bg-bg"
      >
        Activation support
        <Icon name="chevR" size={13} />
      </Link>
    </div>
  )
}

function InfoRows() {
  return (
    <div className="grid gap-2">
      <InfoRow icon="ticket" text="No profile, payment details or tickets are stored on the band." />
      <InfoRow icon="qr" text="Ticketiv checks eligibility during entry; QR tickets stay available as fallback." />
      <InfoRow icon="settings" text="No phone required: support or a participating outlet can handle activation and replacement." />
    </div>
  )
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-[var(--radius)] bg-bg/70 px-3 py-2">
      <Icon name={icon} size={13} className="mt-0.5 text-ink-3" />
      <p className="text-[12px] leading-relaxed text-ink-3">{text}</p>
    </div>
  )
}

function TicketRow({ ticket, border }: { ticket: TapBandTicketLink; border?: boolean }) {
  return (
    <div className={"flex items-center gap-2.5 px-3 py-2.5 " + (border ? "border-t border-line" : "")}>
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon name="ticket" size={13} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-semibold text-ink">{ticket.eventTitle}</span>
        <span className="font-mono text-[10px] leading-relaxed text-ink-3">
          {ticket.ticketLabel} {ticket.eventStartsAt ? `- ${formatDateTime(ticket.eventStartsAt)}` : ""}
        </span>
      </div>
      <Icon name="chevR" size={13} className="text-ink-3" />
    </div>
  )
}

function HistoryRow({ credential, border }: { credential: TapBandCredentialCard; border?: boolean }) {
  return (
    <div className={"flex items-start gap-2.5 px-3.5 py-3 " + (border ? "border-t border-line" : "")}>
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg text-ink-3">
        <Icon name="clock" size={13} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-ink">{credential.safeLabel}</span>
          <StatusBadge tone={credential.statusTone}>{credential.statusLabel}</StatusBadge>
        </div>
        <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-ink-3">
          {credential.lineageLabel ?? formatDate(credential.revokedAt ?? credential.issuedAt) ?? "Saved for audit"}
        </p>
      </div>
    </div>
  )
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] bg-bg px-2.5 py-2">
      <span className="block font-mono text-[9px] uppercase tracking-wide text-ink-3">{label}</span>
      <span className="mt-0.5 block truncate text-[12px] font-semibold text-ink">{value}</span>
    </div>
  )
}

function StatusBadge({ tone, children }: { tone: TapBandStatusTone; children: React.ReactNode }) {
  return (
    <span
      className={
        "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase " +
        statusToneClass(tone)
      }
    >
      {children}
    </span>
  )
}

function statusToneClass(tone: TapBandStatusTone) {
  if (tone === "active") return "bg-accent-soft text-accent"
  if (tone === "pending") return "bg-warning/10 text-warning"
  if (tone === "warning") return "bg-warning/10 text-warning"
  if (tone === "danger") return "bg-danger-soft text-danger"
  return "bg-bg text-ink-3"
}

function formatDate(value: string | null) {
  if (!value) return null
  return DATE_FMT.format(new Date(value))
}

function formatDateTime(value: string | null) {
  if (!value) return null
  return DATE_TIME_FMT.format(new Date(value))
}
