import { MobileDiscover } from "@/components/quiet/screens/discover/mobile-discover";
import { DesktopDiscover } from "@/components/quiet/screens/discover/desktop-discover";
import { getPublicEventsList } from "@/lib/adapters/events";
import { mapDiscoverEvent, partitionDiscover } from "@/lib/mappers/discover";

export const metadata = {
  title: "Browse events",
  description: "Browse live events, festivals, comedy and workshops near you.",
};

export const revalidate = 60;

export default async function BrowsePage() {
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
