import { MobileDiscover } from "@/components/quiet/screens/discover/mobile-discover";
import { DesktopDiscover } from "@/components/quiet/screens/discover/desktop-discover";
import { getDiscoverFeed } from "@/lib/data/public/discover-feed";

export const metadata = {
  title: "Browse events",
  description: "Browse live events, festivals, comedy and workshops this week and coming up.",
};

export const revalidate = 60;

export default async function BrowsePage() {
  const { thisWeek, upcoming, editorPick } = await getDiscoverFeed();

  return (
    <>
      <div className="md:hidden">
        <MobileDiscover thisWeek={thisWeek} upcoming={upcoming} editorPick={editorPick} />
      </div>
      <div className="hidden md:block">
        <DesktopDiscover thisWeek={thisWeek} upcoming={upcoming} editorPick={editorPick} />
      </div>
    </>
  );
}
