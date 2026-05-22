import { CalendarScreen } from "@/components/quiet/screens/calendar/calendar-screen";

export const metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-[480px]">
      <CalendarScreen />
    </div>
  );
}
