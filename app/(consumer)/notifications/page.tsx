import { NotificationsCentre } from "@/components/quiet/screens/notifications/notifications-centre";
import { getMyNotifications, getMyMutedNotificationTypes } from "@/lib/data/attendee/notifications";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const [notifications, mutedTypes] = await Promise.all([
    getMyNotifications(),
    getMyMutedNotificationTypes(),
  ]);

  return <NotificationsCentre notifications={notifications} mutedTypes={mutedTypes} />;
}
