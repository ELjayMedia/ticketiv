import {
  PhoneShell,
  BrowserShell,
} from "@/components/quiet/shell/preview-shells";
import { MobileDiscover } from "@/components/quiet/screens/discover/mobile-discover";
import { DesktopDiscover } from "@/components/quiet/screens/discover/desktop-discover";
import { MobileEvent } from "@/components/quiet/screens/event-detail/mobile-event";
import { DesktopEvent } from "@/components/quiet/screens/event-detail/desktop-event";
import { MobileCheckout } from "@/components/quiet/screens/checkout/mobile-checkout";
import { DesktopCheckout } from "@/components/quiet/screens/checkout/desktop-checkout";
import { OrderConfirmation } from "@/components/quiet/screens/confirmation/order-confirmation";
import { MyTickets } from "@/components/quiet/screens/tickets/my-tickets";
import { TicketView } from "@/components/quiet/screens/tickets/ticket-view";
import { Transfer } from "@/components/quiet/screens/tickets/transfer";
import { Resale } from "@/components/quiet/screens/tickets/resale";
import { Refund } from "@/components/quiet/screens/tickets/refund";
import { CalendarScreen } from "@/components/quiet/screens/calendar/calendar-screen";
import { FriendsScreen } from "@/components/quiet/screens/friends/friends-screen";
import { ProfileScreen } from "@/components/quiet/screens/profile/profile-screen";
import { DesktopNav } from "@/components/quiet/shell/desktop-nav";
import { MobileTabBar } from "@/components/quiet/shell/mobile-shell";
import { PHOTOS } from "@/lib/photos";

const DEMO_TICKET_TYPES = [
  { id: "regular", name: "Regular", priceMinor: 50000, remaining: 5, sublabel: "5 left at this price" },
  { id: "premium", name: "Premium", priceMinor: 120000, remaining: 18, sublabel: "Front rows · 18 left" },
  { id: "vip", name: "VIP", priceMinor: 250000, remaining: 0, sublabel: "Meet & greet" },
] as const;

const DEMO_PROMO = {
  code: "WELCOME10",
  description: "10% off",
  savedMinor: 10000,
};

const DEMO_ORDER = {
  id: "ord_demo_001",
  orderNumber: "RG7352",
  eventTitle: "Tribal Tales",
  eventSubtitle: "SUNSET SET BY DJ FUN",
  eventPhoto: PHOTOS.dj_set,
  whenDate: "30 Aug",
  whenTime: "15:50",
  seats: ["C-4", "C-5"],
  ticketTypeName: "Regular",
  quantity: 2,
  totalMinor: 101800,
  paymentDescription: "Visa ••42",
  receiptEmail: "you@example.com",
  firstTicketId: "tkt_demo_001",
};

/**
 * /dev/preview — internal screen index.
 * Every shipped screen rendered inside its target device chrome
 * (phone 390×844, browser 1440×900) for visual QA without devtools.
 */
export default function PreviewIndexPage() {
  return (
    <div className="min-h-dvh bg-[#f0eee9] py-12">
      <div className="mx-auto max-w-[1600px] px-8">
        <header className="mb-10 max-w-2xl">
          <div className="text-label">/dev/preview</div>
          <h1 className="mt-1 text-[32px] font-semibold leading-tight tracking-[-0.022em]">
            Ticketiv · Quiet · screen index
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-3">
            Every committed screen rendered inside its target device chrome.
            New screens land here first; only routes that pass design review
            graduate to the production tree.
          </p>
        </header>

        <PreviewSection
          phase={1}
          title="Discover"
          subtitle="Entry point. Tabs at the bottom on mobile; sidebar filters on desktop."
        >
          <PreviewArtboard label="Discover · / · mobile">
            <PhoneShell>
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <MobileDiscover />
              </div>
              <MobileTabBar />
            </PhoneShell>
          </PreviewArtboard>

          <PreviewArtboard label="Discover · / · desktop" wide>
            <BrowserShell
              url="ticketiv.com"
              tabs={["Ticketiv · Discover Mbabane", "Calendar"]}
            >
              <DesktopNav />
              <DesktopDiscover />
            </BrowserShell>
          </PreviewArtboard>
        </PreviewSection>

        <PreviewSection
          phase={2}
          title="Consumer buy flow"
          subtitle="Event detail → checkout → confirmation. No bottom tab bar — focused flows live in the (focused) route group."
        >
          <PreviewArtboard label="Event detail · /events/[id] · mobile">
            <PhoneShell>
              <MobileEvent />
            </PhoneShell>
          </PreviewArtboard>

          <PreviewArtboard label="Event detail · /events/[id] · desktop" wide>
            <BrowserShell
              url="ticketiv.com/events/tribal-tales"
              tabs={["Tribal Tales · Ticketiv"]}
            >
              <DesktopNav breadcrumb="Discover > Music > Tribal Tales" />
              <DesktopEvent />
            </BrowserShell>
          </PreviewArtboard>

          <PreviewArtboard label="Checkout · /events/[id]/checkout · mobile">
            <PhoneShell>
              <MobileCheckout
                eventId="tribal-tales"
                eventTitle="Tribal Tales"
                eventPhoto={PHOTOS.dj_set}
                eventWhenLabel="Wed 30 Aug · 15:50"
                eventVenue="Cafe Natarani"
                ticketTypes={DEMO_TICKET_TYPES}
                appliedPromo={DEMO_PROMO}
              />
            </PhoneShell>
          </PreviewArtboard>

          <PreviewArtboard label="Checkout · /events/[id]/checkout · desktop" wide>
            <BrowserShell
              url="ticketiv.com/events/tribal-tales/checkout"
              tabs={["Checkout · Ticketiv"]}
            >
              <DesktopCheckout
                eventId="tribal-tales"
                eventTitle="Tribal Tales"
                eventPhoto={PHOTOS.dj_set}
                eventWhenLabel="Wed 30 Aug · 15:50"
                ticketTypeName="Regular"
                quantity={2}
                subtotalMinor={100000}
                bookingFeeMinor={10000}
                vatRate={0.15}
                appliedPromo={DEMO_PROMO}
              />
            </BrowserShell>
          </PreviewArtboard>

          <PreviewArtboard label="Confirmation · /orders/[orderId]/confirmation">
            <PhoneShell>
              <OrderConfirmation order={DEMO_ORDER} />
            </PhoneShell>
          </PreviewArtboard>
        </PreviewSection>

        <PreviewSection
          phase={3}
          title="Post-purchase"
          subtitle="My tickets → QR view → transfer / resale / refund. The lifestyle tab screens (Calendar, Friends, Me) round out the consumer surface."
        >
          <PreviewArtboard label="My tickets · /tickets · mobile">
            <PhoneShell>
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <MyTickets />
              </div>
              <MobileTabBar />
            </PhoneShell>
          </PreviewArtboard>

          <PreviewArtboard label="Ticket QR · /tickets/[id] · mobile">
            <PhoneShell>
              <TicketView />
            </PhoneShell>
          </PreviewArtboard>

          <PreviewArtboard label="Transfer · /tickets/[id]/transfer · mobile">
            <PhoneShell>
              <Transfer />
            </PhoneShell>
          </PreviewArtboard>

          <PreviewArtboard label="Resale · /tickets/[id]/resale · mobile">
            <PhoneShell>
              <Resale />
            </PhoneShell>
          </PreviewArtboard>

          <PreviewArtboard label="Refund · /orders/[orderId]/refund · mobile">
            <PhoneShell>
              <Refund />
            </PhoneShell>
          </PreviewArtboard>

          <PreviewArtboard label="Calendar · /calendar · mobile">
            <PhoneShell>
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <CalendarScreen />
              </div>
              <MobileTabBar />
            </PhoneShell>
          </PreviewArtboard>

          <PreviewArtboard label="Friends · /friends · mobile">
            <PhoneShell>
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <FriendsScreen />
              </div>
              <MobileTabBar />
            </PhoneShell>
          </PreviewArtboard>

          <PreviewArtboard label="You · /me · mobile">
            <PhoneShell>
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <ProfileScreen />
              </div>
              <MobileTabBar />
            </PhoneShell>
          </PreviewArtboard>
        </PreviewSection>

        <footer className="border-t border-line pt-6 font-mono text-[11px] text-ink-3">
          PHASE 1 (FOUNDATION + DISCOVER) + PHASE 2 (BUY FLOW) + PHASE 3 (POST-PURCHASE) · 15 OF ~35 SCREENS
        </footer>
      </div>
    </div>
  );
}

function PreviewSection({
  phase,
  title,
  subtitle,
  children,
}: {
  phase: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-16">
      <div className="mb-6">
        <div className="text-label">Phase {phase}</div>
        <h2 className="mt-1 text-h2">{title}</h2>
        <p className="text-[13px] text-ink-3">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-12">{children}</div>
    </section>
  );
}

function PreviewArtboard({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={"flex flex-col items-start gap-3 " + (wide ? "w-full" : "")}>
      <div className="text-label">{label}</div>
      {children}
    </div>
  );
}
