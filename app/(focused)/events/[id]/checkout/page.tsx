import { MobileCheckout } from "@/components/quiet/screens/checkout/mobile-checkout";
import { DesktopCheckout } from "@/components/quiet/screens/checkout/desktop-checkout";
import { PHOTOS } from "@/lib/photos";

/**
 * `/events/[id]/checkout`
 *
 * Note: the consumer layout (mobile tab bar + desktop nav) is intentionally
 * NOT shown on checkout — the route group's layout still wraps this page,
 * but we hide nav inside the screens themselves so users don't get
 * distracted from the buy flow. (TICK-16 cart-persistence keeps state
 * across the OTP redirect.)
 *
 * Phase 2 wiring will:
 *   1. Read selected ticket type + qty from cookie / `cart-persist`
 *   2. Create or refresh a Supabase reservation
 *   3. Pass the live ticket type, qty, prices, hold expiry
 *
 * `holdSeconds` is the remaining lifetime of the existing reservation
 * (`order_items.expires_at - now()`), not a fixed window.
 */

export const metadata = { title: "Checkout" };

const DEMO_TICKET_TYPES = [
  {
    id: "regular",
    name: "Regular",
    priceMinor: 50000,
    remaining: 5,
    sublabel: "5 left at this price",
  },
  {
    id: "premium",
    name: "Premium",
    priceMinor: 120000,
    remaining: 18,
    sublabel: "Front rows · 18 left",
  },
  {
    id: "vip",
    name: "VIP",
    priceMinor: 250000,
    remaining: 0,
    sublabel: "Meet & greet",
  },
];

const DEMO_PROMO = {
  code: "WELCOME10",
  description: "10% off",
  savedMinor: 10000,
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sharedProps = {
    eventId: id,
    eventTitle: "Tribal Tales",
    eventPhoto: PHOTOS.dj_set,
    eventWhenLabel: "Wed 30 Aug · 15:50",
    eventVenue: "Cafe Natarani",
  };

  return (
    <>
      <div className="h-dvh md:hidden">
        <MobileCheckout
          {...sharedProps}
          ticketTypes={DEMO_TICKET_TYPES}
          appliedPromo={DEMO_PROMO}
        />
      </div>
      <div className="hidden md:block">
        <DesktopCheckout
          {...sharedProps}
          ticketTypeName="Regular"
          quantity={2}
          subtotalMinor={100000}
          bookingFeeMinor={10000}
          vatRate={0.15}
          appliedPromo={DEMO_PROMO}
        />
      </div>
    </>
  );
}
