import { NotificationsCentre } from "@/components/quiet/screens/notifications/notifications-centre";
import { getMyNotifications } from "@/lib/data/attendee/notifications";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const notifications = await getMyNotifications();

  return <NotificationsCentre notifications={notifications} />;
}
