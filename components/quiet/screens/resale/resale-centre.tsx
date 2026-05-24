import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import type { AttendeeTicketListing, PublicEventTicketListing } from "@/lib/data/attendee/ticket-listings";
import { ListingStartForm } from "@/components/quiet/screens/resale/listing-start-form";

interface TicketListingsCentreProps {
  listings: AttendeeTicketListing[];
  publicListings?: PublicEventTicketListing[];
  ticketId?: string | null;
  eventId?: string | null;
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-SZ", {
    style: "currency",
    currency: currency || "SZL",
    maximumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function formatExpiry(iso: string | null): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(diff)) return null;
  if (diff <= 0) return "Listing expired";
  const hours = Math.ceil(diff / 3_600_000);
  if (hours < 24) return `Expires in ${hours}h`;
  const days = Math.ceil(hours / 24);
  return `Expires in ${days}d`;
}

function statusTone(status: string): { label: string; className: string } {
  const normalized = status.toLowerCase();
  if (["active", "listed", "available"].includes(normalized)) {
    return { label: "Active", className: "bg-accent-soft text-accent" };
  }
  if (["sold", "completed", "transferred"].includes(normalized)) {
    return { label: "Completed", className: "bg-accent-soft text-accent" };
  }
  if (["expired", "cancelled", "canceled", "failed"].includes(normalized)) {
    return { label: normalized.replaceAll("_", " "), className: "bg-[#fdf0ec] text-[#c1422b]" };
  }
  return { label: normalized.replaceAll("_", " ") || "Pending", className: "bg-[#fdf6ed] text-[#c1841c]" };
}

export function TicketListingsCentre({ listings, publicListings = [], ticketId, eventId }: TicketListingsCentreProps) {
  const hasListings = listings.length > 0;
  const hasPublicListings = publicListings.length > 0;
  const activeCount = listings.filter((listing) => ["active", "listed", "available"].includes(listing.status.toLowerCase())).length;
  const showBuyerContext = Boolean(eventId) && !ticketId;

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
        <div className="text-label">Ticket listings</div>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h1 className="text-h1">Resale</h1>
          {hasListings && (
            <span className="rounded bg-accent-soft px-2 py-1 font-mono text-[10px] font-semibold uppercase text-accent">
              {activeCount} active
            </span>
          )}
        </div>
        <p className="mt-2 font-mono text-[12px] leading-relaxed text-ink-3">
          Track tickets you list for another buyer, or browse active listings for sold-out events.
        </p>
      </header>

      {ticketId && <ListingStartForm ticketId={ticketId} />}

      {showBuyerContext && (
        <section className="px-5 pb-4">
          <Card className="border-line-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[14px] font-semibold">Available resale tickets</div>
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-3">
                  {hasPublicListings
                    ? "Choose from active listings. Checkout and transfer completion will be connected in the next step."
                    : "No active public listings are available for this event yet."}
                </p>
              </div>
              {hasPublicListings && (
                <span className="rounded bg-accent-soft px-2 py-1 font-mono text-[10px] font-semibold uppercase text-accent">
                  {publicListings.length} found
                </span>
              )}
            </div>
          </Card>
        </section>
      )}

      {showBuyerContext && hasPublicListings && (
        <section className="px-5 pb-4">
          <ul className="flex flex-col gap-2">
            {publicListings.map((listing) => {
              const expiry = formatExpiry(listing.listingExpiresAt);
              const fee = listing.transferFeeCents ? formatMoney(listing.transferFeeCents, listing.currency) : null;
              return (
                <li key={listing.id}>
                  <Card className="p-3.5" flat>
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                        <Icon name="ticket" size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <span className="min-w-0 flex-1 text-[13px] font-semibold">
                            {listing.ticketTypeName ?? "Resale ticket"}
                          </span>
                          <span className="shrink-0 text-[13px] font-semibold text-accent">
                            {formatMoney(listing.priceCents, listing.currency)}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-3">
                          {listing.eventTitle ?? "Event"}{fee ? ` · transfer fee ${fee}` : ""}
                        </p>
                        {expiry && (
                          <p className="mt-1 font-mono text-[11px] font-semibold text-accent">
                            {expiry}
                          </p>
                        )}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {listing.eventSlug ? (
                            <Link
                              href={`/events/${listing.eventSlug}`}
                              className="inline-flex items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold hover:bg-bg"
                            >
                              View event
                            </Link>
                          ) : (
                            <span className="inline-flex items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold text-ink-3">
                              Event
                            </span>
                          )}
                          <span className="inline-flex items-center justify-center rounded-[var(--radius)] bg-surface-2 px-3 py-2 text-[12px] font-semibold text-ink-3">
                            Checkout next
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!hasListings ? (
        <section className="px-5">
          <Card className="p-6 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon name="ticket" size={22} />
            </div>
            <div className="mt-4 text-[15px] font-semibold">No listings yet</div>
            <p className="mx-auto mt-1.5 max-w-[320px] font-mono text-[11px] leading-relaxed text-ink-3">
              Eligible unused tickets you make available to another buyer will appear here with status, expiry and transfer outcome.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link
                href="/tickets"
                className="inline-flex items-center justify-center rounded-[var(--radius)] bg-ink px-3 py-2 text-[12px] font-semibold text-white hover:bg-ink-2"
              >
                My tickets
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold hover:bg-bg"
              >
                Browse events
              </Link>
            </div>
          </Card>
        </section>
      ) : (
        <section className="px-5">
          <ul className="flex flex-col gap-2">
            {listings.map((listing) => {
              const tone = statusTone(listing.status);
              const expiry = formatExpiry(listing.listingExpiresAt);
              const fee = listing.transferFeeCents ? formatMoney(listing.transferFeeCents, listing.currency) : null;

              return (
                <li key={listing.id}>
                  <Card className="p-3.5" flat>
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                        <Icon name="ticket" size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <span className="min-w-0 flex-1 text-[13px] font-semibold">
                            {formatMoney(listing.priceCents, listing.currency)}
                          </span>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${tone.className}`}>
                            {tone.label}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-3">
                          Listed {formatDate(listing.createdAt)}{fee ? ` · transfer fee ${fee}` : ""}
                        </p>
                        {expiry && (
                          <p className="mt-1 font-mono text-[11px] font-semibold text-accent">
                            {expiry}
                          </p>
                        )}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {listing.orderItemId ? (
                            <Link
                              href={`/tickets/${listing.orderItemId}`}
                              className="inline-flex items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold hover:bg-bg"
                            >
                              View ticket
                            </Link>
                          ) : (
                            <span className="inline-flex items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold text-ink-3">
                              Ticket hidden
                            </span>
                          )}
                          <Link
                            href="/notifications"
                            className="inline-flex items-center justify-center rounded-[var(--radius)] bg-ink px-3 py-2 text-[12px] font-semibold text-white hover:bg-ink-2"
                          >
                            Updates
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
