import { redirect } from "next/navigation";
import { CalendarScreen } from "@/components/quiet/screens/calendar/calendar-screen";
import { getMyCalendarMonth } from "@/lib/data/attendee/calendar";
import { mapCalendar } from "@/lib/mappers/calendar";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const month = await getMyCalendarMonth();
  if (!month) {
    redirect("/login");
  }

  const props = mapCalendar(month!);

  return (
    <div className="mx-auto max-w-[480px]">
      <CalendarScreen {...props} />
    </div>
  );
}
