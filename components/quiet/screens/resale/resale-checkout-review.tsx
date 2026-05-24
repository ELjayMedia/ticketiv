import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import type { PublicEventTicketListing } from "@/lib/data/attendee/ticket-listings";

interface ResaleCheckoutReviewProps {
  listing: PublicEventTicketListing | null;
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-SZ", {
    style: "currency",
    currency: currency || "SZL",
    maximumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

function formatExpiry(iso: string | null): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(diff)) return null;
  if (diff <= 0) return "This listing has expired";
  const hours = Math.ceil(diff / 3_600_000);
  if (hours < 24) return `Listing expires in ${hours}h`;
  const days = Math.ceil(hours / 24);
  return `Listing expires in ${days}d`;
}

export function ResaleCheckoutReview({ listing }: ResaleCheckoutReviewProps) {
  if (!listing) {
    return (
      <div className="mx-auto max-w-[480px] bg-bg pb-24">
        <div className="h-14" />
        <header className="px-5 pb-4 pt-2">
          <Link
            href="/resale"
            className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
            aria-label="Back to resale"
          >
            <Icon name="chevL" size={20} />
          </Link>
          <div className="text-label">Resale checkout</div>
          <h1 className="text-h1 mt-1">Listing unavailable</h1>
          <p className="mt-2 font-mono text-[12px] leading-relaxed text-ink-3">
            This listing is no longer active or cannot be shown. Browse the event again to see available resale tickets.
          </p>
        </header>
        <section className="px-5">
          <Card className="p-6 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#fdf0ec] text-[#c1422b]">
              <Icon name="ticket" size={22} />
            </div>
            <div className="mt-4 text-[15px] font-semibold">No active listing found</div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link
                href="/resale"
                className="inline-flex items-center justify-center rounded-[var(--radius)] bg-ink px-3 py-2 text-[12px] font-semibold text-white hover:bg-ink-2"
              >
                Resale
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold hover:bg-bg"
              >
                Discover
              </Link>
            </div>
          </Card>
        </section>
      </div>
    );
  }

  const feeCents = listing.transferFeeCents ?? 0;
  const totalCents = listing.priceCents + feeCents;
  const expiry = formatExpiry(listing.listingExpiresAt);
  const eventHref = listing.eventSlug ? `/events/${listing.eventSlug}` : "/";

  return (
    <div className="mx-auto max-w-[480px] bg-bg pb-24">
      <div className="h-14" />

      <header className="px-5 pb-4 pt-2">
        <Link
          href={listing.eventSlug ? `/resale?eventId=${encodeURIComponent(listing.orderItemId ?? "")}` : "/resale"}
          className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
          aria-label="Back to resale"
        >
          <Icon name="chevL" size={20} />
        </Link>
        <div className="text-label">Resale checkout</div>
        <h1 className="text-h1 mt-1">Review ticket</h1>
        <p className="mt-2 font-mono text-[12px] leading-relaxed text-ink-3">
          Review the resale listing before payment and ticket transfer are enabled.
        </p>
      </header>

      <section className="space-y-3 px-5">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon name="ticket" size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{listing.ticketTypeName ?? "Resale ticket"}</div>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-3">
                {listing.eventTitle ?? "Event"}
              </p>
              {expiry && <p className="mt-2 font-mono text-[11px] font-semibold text-accent">{expiry}</p>}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-label mb-3">Price breakdown</div>
          <div className="space-y-2 font-mono text-[12px] text-ink-3">
            <div className="flex justify-between gap-3">
              <span>Listing price</span>
              <span className="font-semibold text-ink">{formatMoney(listing.priceCents, listing.currency)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Transfer fee</span>
              <span>{formatMoney(feeCents, listing.currency)}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-line pt-2 text-[13px]">
              <span className="font-semibold text-ink">Total due</span>
              <span className="font-semibold text-accent">{formatMoney(totalCents, listing.currency)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-label mb-3">How transfer will work</div>
          <div className="space-y-3 font-mono text-[11px] leading-relaxed text-ink-3">
            <div className="flex gap-2">
              <span className="font-semibold text-accent">1.</span>
              <span>Buyer confirms this listing and completes payment.</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-accent">2.</span>
              <span>Ticketiv marks the listing as sold and starts the ticket transfer.</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-accent">3.</span>
              <span>The ticket appears in the buyer’s My Tickets area after transfer completion.</span>
            </div>
          </div>
        </Card>

        <Card className="border-[#f3dfb7] bg-[#fdf6ed] p-3.5">
          <div className="flex items-start gap-3">
            <Icon name="clock" size={16} className="mt-0.5 text-[#8a5f08]" />
            <p className="font-mono text-[11px] leading-relaxed text-[#8a5f08]">
              Payment and ownership transfer are intentionally disabled in this review patch. Next step: connect payment, mark the listing sold, and complete the transfer in one safe server-side flow.
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={eventHref}
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 text-[12px] font-semibold hover:bg-bg"
          >
            View event
          </Link>
          <button
            type="button"
            disabled
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-surface-2 px-3 text-[12px] font-semibold text-ink-3"
          >
            Payment next
          </button>
        </div>
      </section>
    </div>
  );
}
