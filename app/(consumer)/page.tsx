import { MobileDiscover } from "@/components/quiet/screens/discover/mobile-discover";
import { DesktopDiscover } from "@/components/quiet/screens/discover/desktop-discover";

export const metadata = {
  title: "Discover what's on",
  description: "Live events, festivals, comedy and workshops near you.",
};

/**
 * Discover · "/"
 *
 * Both viewports are rendered as siblings and toggled with Tailwind;
 * keeps this a pure server component and avoids hydration mismatch
 * from useMediaQuery.
 *
 * Once Phase 2 wires in Supabase, both children become async and pull
 * the same list of events from `events_public` (or the equivalent
 * RLS-safe view).
 */
export default function DiscoverPage() {
  return (
    <>
      <div className="md:hidden">
        <MobileDiscover />
      </div>
      <div className="hidden md:block">
        <DesktopDiscover />
      </div>
    </>
  );
}
