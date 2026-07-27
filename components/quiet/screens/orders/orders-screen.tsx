import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Chip } from "@/components/quiet/ui/chip";
import { EmptyState } from "@/components/quiet/ui/empty-state";
import { formatPrice, formatEventDate, type Currency } from "@/lib/format";
import type { OrderListItem } from "@/lib/data/attendee/orders";

const STATUS_LABEL: Record<string, string> = {
  paid: "Confirmed",
  pending: "Processing",
  failed: "Failed",
  refunded: "Refunded",
  cancelled: "Cancelled",
  awaiting_payment: "Awaiting payment",
};

const STATUS_VARIANT: Record<string, "accent" | "muted" | "default"> = {
  paid: "accent",
  pending: "default",
  failed: "default",
  refunded: "muted",
  cancelled: "muted",
  awaiting_payment: "default",
};

interface OrdersScreenProps {
  orders: OrderListItem[];
}

export function OrdersScreen({ orders }: OrdersScreenProps) {
  return (
    <div className="mx-auto max-w-[480px] bg-bg pb-24">
      <div className="h-14" />

      <header className="px-5 pb-4 pt-2">
        <Link
          href="/me"
          className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
          aria-label="Back to account"
        >
          <Icon name="chevL" size={20} />
        </Link>
        <div className="text-label">Account</div>
        <h1 className="text-h1 mt-1">Orders</h1>
        <p className="mt-1.5 text-[13px] text-ink-3">
          Your purchase history and receipts.
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="px-5">
          <EmptyState
            icon="fileText"
            title="No orders yet"
            description="When you buy tickets your orders will appear here."
            action={{ label: "Browse events", href: "/" }}
          />
        </div>
      ) : (
        <section className="flex flex-col gap-2 px-5">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </section>
      )}
    </div>
  );
}

function OrderRow({ order }: { order: OrderListItem }) {
  const statusLabel = STATUS_LABEL[order.status] ?? order.status;
  const statusVariant = STATUS_VARIANT[order.status] ?? "default";
  const currency = (order.currency || "SZL") as Currency;

  const orderedDate = new Date(order.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const eventDate = order.event_starts_at
    ? formatEventDate(order.event_starts_at)
    : null;

  return (
    <Card className="flex gap-3 p-3.5">
      <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-surface-2">
        {order.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={order.cover_image_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-4">
            <Icon name="ticket" size={24} strokeWidth={1.4} />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[14px] font-semibold leading-snug">
            {order.event_title ?? "Ticket order"}
          </p>
          <Chip variant={statusVariant} size="sm" className="shrink-0">
            {statusLabel}
          </Chip>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-3">
          {eventDate && (
            <>
              <Icon name="cal" size={11} />
              <span>{eventDate}</span>
              <span className="text-line-2">·</span>
            </>
          )}
          {order.venue_name && (
            <>
              <Icon name="pin" size={11} />
              <span className="truncate">{order.venue_name}</span>
              <span className="text-line-2">·</span>
            </>
          )}
          <Icon name="ticket" size={11} />
          <span>
            {order.ticket_count} ticket{order.ticket_count !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-mono text-[13px] font-semibold tabular-nums">
            {formatPrice(order.total_cents, currency)}
          </span>
          <span className="font-mono text-[11px] text-ink-4">{orderedDate}</span>
        </div>

        {order.status === "paid" && order.ticket_count > 0 && (
          <Link
            href="/tickets"
            className="mt-1 inline-flex w-fit items-center gap-1 text-[11px] font-semibold text-accent"
          >
            View tickets
            <Icon name="chevR" size={12} />
          </Link>
        )}
      </div>
    </Card>
  );
}
