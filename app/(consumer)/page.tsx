import { MobileDiscover } from "@/components/quiet/screens/discover/mobile-discover";
import { DesktopDiscover } from "@/components/quiet/screens/discover/desktop-discover";
import { getPublicEventsList } from "@/lib/adapters/events";
import { mapDiscoverEvent, partitionDiscover } from "@/lib/mappers/discover";

export const metadata = {
  title: "Discover what's on",
  description: "Live events, festivals, comedy and workshops near you.",
};

// Public discovery reads the anonymous `v_public_event_cards` read model via a
// cookie-free Supabase client. Keep this route cacheable and periodically
// revalidated; do not subscribe it directly to orders/payments/scans.
export const revalidate = 60;

/**
 * Discover · "/"
 *
 * Both viewports are rendered as siblings and toggled with Tailwind so the
 * page stays a pure RSC (no useMediaQuery hydration mismatch). Data comes
 * from `v_public_event_cards` via lib/adapters/events.ts, mapped into a
 * UI-friendly shape and partitioned client-side into Tonight / This week.
 */
export default async function DiscoverPage() {
  const rows = await getPublicEventsList({ limit: 36, sort: "soonest" });
  const events = rows.map(mapDiscoverEvent);
  const { tonight, thisWeek, editorPick } = partitionDiscover(events);

  return (
    <>
      <div className="md:hidden">
        <MobileDiscover
          tonight={tonight}
          thisWeek={thisWeek.length > 0 ? thisWeek : events.slice(0, 6)}
          editorPick={editorPick}
          eventCount={events.length}
        />
      </div>
      <div className="hidden md:block">
        <DesktopDiscover
          events={events.slice(0, 9)}
          editorPick={editorPick}
          totalEvents={events.length}
        />
      </div>
    </>
  );
}
