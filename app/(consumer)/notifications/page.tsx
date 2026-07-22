import { redirect } from "next/navigation";

import { NotificationsCentre } from "@/components/quiet/screens/notifications/notifications-centre";
import { getMyNotifications, getMyMutedNotificationTypes } from "@/lib/data/attendee/notifications";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    redirect("/login?next=/notifications");
  }

  const [notifications, mutedTypes] = await Promise.all([
    getMyNotifications(),
    getMyMutedNotificationTypes(),
  ]);

  return <NotificationsCentre notifications={notifications} mutedTypes={mutedTypes} />;
}
