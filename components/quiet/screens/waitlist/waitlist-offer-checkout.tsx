import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import type { AttendeeWaitlistEntry } from "@/lib/data/attendee/waitlist";
import { WaitlistCheckoutAction } from "@/components/quiet/screens/waitlist/waitlist-checkout-action";

interface WaitlistOfferCheckoutProps {
  offer: AttendeeWaitlistEntry | null;
  pendingOrderId?: string | null;
  pendingPaymentId?: string | null;
}

function formatMoney(cents: number | null, currency: string | null): string {
  return new Intl.NumberFormat("en-SZ", {
    style: "currency",
    currency: currency || "SZL",
    maximumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

function formatExpiry(iso: string | null): { label: string; expired: boolean } | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(diff)) return null;
  if (diff <= 0) return { label: "Offer expired", expired: true };
  const hours = Math.ceil(diff / 3_600_000);
  if (hours < 24) return { label: `Offer expires in ${hours}h`, expired: false };
  const days = Math.ceil(hours / 24);
  return { label: `Offer expires in ${days}d`, expired: false };
}

function isOfferStatus(status: string): boolean {
  return ["offered", "offer_available", "notified"].includes(status.toLowerCase());
}

export function WaitlistOfferCheckout({ offer, pendingOrderId, pendingPaymentId }: WaitlistOfferCheckoutProps) {
  if (!offer) {
    return (
      <div className="mx-auto max-w-[480px] bg-bg pb-24">
        <div className="h-14" />
        <header className="px-5 pb-4 pt-2">
          <Link href="/waitlist" className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60" aria-label="Back to waitlist">
            <Icon name="chevL" size={20} />
          </Link>
          <div className="text-label">Waitlist checkout</div>
          <h1 className="text-h1 mt-1">Offer unavailable</h1>
          <p className="mt-2 font-mono text-[12px] leading-relaxed text-ink-3">
            This waitlist offer is no longer available or does not belong to your account.
          </p>
        </header>
        <section className="px-5">
          <Card className="p-6 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#fdf0ec] text-[#c1422b]">
              <Icon name="clock" size={22} />
            </div>
            <div className="mt-4 text-[15px] font-semibold">No active offer found</div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href="/waitlist" className="inline-flex items-center justify-center rounded-[var(--radius)] bg-ink px-3 py-2 text-[12px] font-semibold text-white hover:bg-ink-2">
                Waitlist
              </Link>
              <Link href="/notifications" className="inline-flex items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold hover:bg-bg">
                Notifications
              </Link>
            </div>
          </Card>
        </section>
      </div>
    );
  }

  const expiry = formatExpiry(offer.offerExpiresAt);
  const canProceed = isOfferStatus(offer.status) && expiry?.expired === false;
  const unitPrice = offer.ticketPriceCents ?? 0;
  const quantity = Math.max(1, offer.quantityRequested);
  const total = unitPrice * quantity;
  const eventHref = offer.eventSlug ? `/events/${offer.eventSlug}` : "/";

  return (
    <div className="mx-auto max-w-[480px] bg-bg pb-24">
      <div className="h-14" />

      <header className="px-5 pb-4 pt-2">
        <Link href="/waitlist" className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60" aria-label="Back to waitlist">
          <Icon name="chevL" size={20} />
        </Link>
        <div className="text-label">Waitlist checkout</div>
        <h1 className="text-h1 mt-1">Review offer</h1>
        <p className="mt-2 font-mono text-[12px] leading-relaxed text-ink-3">
          Confirm the offer details before the payment provider handoff and ticket issuing are connected.
        </p>
      </header>

      <section className="space-y-3 px-5">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon name="clock" size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{offer.ticketTypeName ?? "Waitlist ticket"}</div>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-3">
                {offer.eventTitle ?? "Event"} · {quantity} requested
              </p>
              {expiry && (
                <p className={`mt-2 font-mono text-[11px] font-semibold ${expiry.expired ? "text-[#c1422b]" : "text-accent"}`}>
                  {expiry.label}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-label mb-3">Offer breakdown</div>
          <div className="space-y-2 font-mono text-[12px] text-ink-3">
            <div className="flex justify-between gap-3">
              <span>Unit price</span>
              <span className="font-semibold text-ink">{formatMoney(unitPrice, offer.ticketCurrency)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Quantity</span>
              <span>{quantity}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-line pt-2 text-[13px]">
              <span className="font-semibold text-ink">Total due</span>
              <span className="font-semibold text-accent">{formatMoney(total, offer.ticketCurrency)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-label mb-3">What happens next</div>
          <div className="space-y-3 font-mono text-[11px] leading-relaxed text-ink-3">
            <div className="flex gap-2">
              <span className="font-semibold text-accent">1.</span>
              <span>Ticketiv creates a pending waitlist checkout order.</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-accent">2.</span>
              <span>You complete payment through the configured payment provider.</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-accent">3.</span>
              <span>After payment succeeds, Ticketiv issues the ticket and shows it in My Tickets.</span>
            </div>
          </div>
        </Card>

        <Card className="border-[#f3dfb7] bg-[#fdf6ed] p-3.5">
          <div className="flex items-start gap-3">
            <Icon name="clock" size={16} className="mt-0.5 text-[#8a5f08]" />
            <p className="font-mono text-[11px] leading-relaxed text-[#8a5f08]">
              This step creates the pending waitlist checkout only. Tickets are still issued only after a linked payment succeeds.
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Link href={eventHref} className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 text-[12px] font-semibold hover:bg-bg">
            View event
          </Link>
          <WaitlistCheckoutAction
            waitlistId={offer.id}
            pendingOrderId={pendingOrderId}
            pendingPaymentId={pendingPaymentId}
            canProceed={canProceed}
          />
        </div>
      </section>
    </div>
  );
}
