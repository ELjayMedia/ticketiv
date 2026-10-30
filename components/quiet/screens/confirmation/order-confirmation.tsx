import Link from "next/link";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Photo } from "@/components/quiet/ui/primitives";
import { formatPrice } from "@/lib/format";
import type { ConfirmationProps, ConfirmationState } from "@/lib/mappers/confirmation";

/* ──────────────────────────────────────────────────────────────
 * Order confirmation · `/orders/[orderId]/confirmation`
 *
 * Direct port of QuietConfirm. The artboard is mobile-first but
 * the layout works on desktop within a narrow column — we cap
 * width at 480-ish so it doesn't feel sparse on a 1440 viewport.
 * ────────────────────────────────────────────────────────────── */

interface OrderConfirmationProps {
  order: ConfirmationProps;
}

const STATE_ICON: Record<ConfirmationState, IconName> = {
  paid: "check",
  pending: "clock",
  failed: "close",
  refunded: "fileText",
};

const STATE_TONE: Record<ConfirmationState, string> = {
  paid: "bg-accent-soft text-accent",
  pending: "bg-warning/10 text-warning",
  failed: "bg-danger/10 text-danger",
  refunded: "bg-line/40 text-ink-3",
};

function NextStep({ icon, title, sub }: { icon: IconName; title: string; sub: string }) {
  return (
    <Card className="flex items-center gap-3 p-3" flat>
      <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon name={icon} size={16} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13px] font-semibold">{title}</span>
        <span className="font-mono text-[11px] text-ink-3">{sub}</span>
      </div>
    </Card>
  );
}

export function OrderConfirmation({ order }: OrderConfirmationProps) {
  const showTickets = order.state === "paid";
  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col">
        {/* Top close */}
        <header className="flex items-center px-5 pb-6 pt-14">
          <span className="flex-1" />
          <Link
            href="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
            aria-label="Close"
          >
            <Icon name="close" size={22} />
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Status header */}
          <section className="px-5 pb-6 text-center">
            <div
              className={
                "mx-auto mb-4 inline-flex h-[72px] w-[72px] items-center justify-center rounded-full " +
                STATE_TONE[order.state]
              }
            >
              <Icon name={STATE_ICON[order.state]} size={36} strokeWidth={2.4} />
            </div>
            <h1 className="text-[26px] font-semibold tracking-[-0.022em]">
              {order.headline}
            </h1>
            <p className="mt-2 font-mono text-[12px] uppercase text-ink-3">
              {showTickets
                ? `${order.quantity} TICKET${order.quantity === 1 ? "" : "S"} · ORDER #${order.orderNumber}`
                : `ORDER #${order.orderNumber}`}
            </p>
            {order.state === "paid" ? (
              <p className="mx-auto mt-3 max-w-[360px] text-[13px] text-ink-2">
                Your tickets are on their way to{" "}
                <span className="font-semibold text-ink">{order.receiptEmail}</span>.
              </p>
            ) : (
              <p className="mx-auto mt-3 max-w-[360px] text-[13px] text-ink-2">
                {order.statusNote}
              </p>
            )}
          </section>

          {/* Event card */}
          <section className="px-5 pb-4">
            <Card className="overflow-hidden">
              <Photo src={order.eventPhoto} height={140} overlay="dim">
                <div className="mt-auto">
                  <h2 className="text-[22px] font-semibold leading-tight text-white">
                    {order.eventTitle}
                  </h2>
                  {order.eventSubtitle && (
                    <div className="mt-1 font-mono text-[11px] uppercase text-white/85">
                      {order.eventSubtitle}
                    </div>
                  )}
                </div>
              </Photo>
              <div className="p-3.5">
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col">
                    <span className="text-label">When</span>
                    <span className="mt-0.5 text-[13px] font-semibold">{order.whenDate}</span>
                    <span className="font-mono text-[10px] text-ink-3">{order.whenTime}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-label">
                      {order.seats?.length ? "Seats" : "Tickets"}
                    </span>
                    <span className="mt-0.5 text-[13px] font-semibold">
                      {order.seats?.length ? order.seats.join(", ") : order.ticketSummary}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-label">Total</span>
                    <span className="mt-0.5 font-mono text-[13px] font-semibold">
                      {formatPrice(order.totalMinor, order.currency)}
                    </span>
                    <span className="font-mono text-[10px] text-ink-3">
                      {order.paymentDescription}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Next steps — only when tickets are issued */}
          {showTickets && order.calendar && (
            <section className="px-5 pb-4">
              <div className="text-label mb-2">Add to calendar</div>
              <div className="grid grid-cols-2 gap-1.5">
                <a href={order.calendar.google} target="_blank" rel="noopener noreferrer">
                  <NextStep icon="cal" title="Google Calendar" sub="Opens in a new tab" />
                </a>
                <a href={order.calendar.ics} download={`ticketiv-${order.orderNumber}.ics`}>
                  <NextStep icon="download" title="Apple / Outlook" sub="Reminder 3h before" />
                </a>
              </div>
            </section>
          )}

          <section className="px-5 pb-4">
            <Link href="/support" className="block">
              <Card className="flex items-center gap-3 p-3" flat>
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-bg text-ink-3">
                  <Icon name="spark" size={16} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] font-semibold">Need help with this order?</span>
                  <span className="font-mono text-[11px] text-ink-3">
                    Email support@ticketiv.app for payment, delivery, or entry support
                  </span>
                </div>
                <Icon name="chevR" size={16} className="text-ink-3" />
              </Card>
            </Link>
          </section>

          {/* Receipt */}
          <section className="pb-8">
            <div className="flex items-center justify-center gap-1.5 font-mono text-[11px] text-ink-3">
              <Icon name="fileText" size={12} />
              {showTickets ? `Receipt sent to ${order.receiptEmail}` : `Order #${order.orderNumber}`}
            </div>
          </section>

          <div className="h-20" />
        </div>

        {/* Sticky bottom actions — adapt per state */}
        <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-surface px-5 py-3.5 pb-7">
          {order.state === "paid" ? (
            <>
              <Link
                href="/tickets"
                className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] border border-line-2 bg-surface px-4 py-3.5 text-[14px] font-semibold hover:bg-bg"
              >
                My tickets
              </Link>
              <Link
                href={`/tickets/${order.firstTicketId}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3.5 text-[14px] font-semibold text-white hover:opacity-90"
              >
                {order.quantity > 1 ? "View tickets" : "View ticket"} <Icon name="arrowR" size={16} />
              </Link>
            </>
          ) : order.state === "failed" ? (
            <>
              <Link
                href="/tickets"
                className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] border border-line-2 bg-surface px-4 py-3.5 text-[14px] font-semibold hover:bg-bg"
              >
                My tickets
              </Link>
              {order.eventSlug && (
                <Link
                  href={`/events/${order.eventSlug}?tickets=1`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3.5 text-[14px] font-semibold text-white hover:opacity-90"
                >
                  Try again <Icon name="arrowR" size={16} />
                </Link>
              )}
            </>
          ) : order.state === "refunded" ? (
            <Link
              href="/tickets"
              className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] border border-line-2 bg-surface px-4 py-3.5 text-[14px] font-semibold hover:bg-bg"
            >
              My tickets
            </Link>
          ) : (
            <>
              <Link
                href="/tickets"
                className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] border border-line-2 bg-surface px-4 py-3.5 text-[14px] font-semibold hover:bg-bg"
              >
                My tickets
              </Link>
              <span className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-warning/10 px-4 py-3.5 text-[14px] font-semibold text-warning">
                <Icon name="clock" size={16} /> Confirming…
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
