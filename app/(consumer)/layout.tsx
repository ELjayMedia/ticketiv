import { DesktopNav } from "@/components/quiet/shell/desktop-nav";
import { MobileTabBar } from "@/components/quiet/shell/mobile-shell";

/**
 * Consumer surface layout.
 *
 * On mobile we render a tab bar; on desktop a slim top nav.
 * Both shells are present in the DOM and toggled with Tailwind's
 * responsive utilities — this lets server components stay
 * server components (no useMediaQuery dance) and matches the
 * Linear/Vercel approach of two distinct shells, not one
 * responsive blob.
 */
export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      {/* Desktop nav (≥ md) */}
      <div className="hidden md:block">
        <DesktopNav />
      </div>

      <main className="pb-20 md:pb-12">{children}</main>

      {/* Mobile tab bar (< md) */}
      <div className="block md:hidden">
        <MobileTabBar />
      </div>
    </div>
  );
}
