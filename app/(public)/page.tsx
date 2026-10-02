import { MobileDiscover } from "@/components/quiet/screens/discover/mobile-discover";
import { DesktopDiscover } from "@/components/quiet/screens/discover/desktop-discover";
import { ConsumerFrame } from "@/components/quiet/shell/consumer-frame";
import { PublicSessionDesktopNav } from "@/components/quiet/shell/public-session-desktop-nav";
import { getDiscoverFeed } from "@/lib/data/public/discover-feed";

export const metadata = {
  title: "Discover what's on",
  description: "Live events, festivals, comedy and workshops this week and coming up.",
};

// Public discovery reads the anonymous `v_public_event_cards` read model via a
// cookie-free Supabase client. Keep this route cacheable and periodically
// revalidated; do not subscribe it directly to orders/payments/scans.
export const dynamic = "force-static";
export const revalidate = 60;

/**
 * Discover · "/"
 *
 * Both viewports are rendered as siblings and toggled with Tailwind so the
 * page stays a pure RSC (no useMediaQuery hydration mismatch). Data comes
 * from `v_public_event_cards` via lib/adapters/events.ts, mapped into a
 * UI-friendly shape and split into "This week" and "Upcoming" (lib/data/public/discover-feed).
 */
export default async function DiscoverPage() {
  const { thisWeek, upcoming, editorPick } = await getDiscoverFeed();

  return (
    <ConsumerFrame desktopNav={<PublicSessionDesktopNav />}>
      <div className="md:hidden">
        <MobileDiscover thisWeek={thisWeek} upcoming={upcoming} editorPick={editorPick} />
      </div>
      {/* Desktop search is owned by the persistent top navigation. Hide the
          discover screen's legacy inline form while retaining its filter tools. */}
      <div className="hidden md:block [&>div>form]:hidden">
        <DesktopDiscover thisWeek={thisWeek} upcoming={upcoming} editorPick={editorPick} />
      </div>
    </ConsumerFrame>
  );
}
