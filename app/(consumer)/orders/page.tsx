import { redirect } from "next/navigation";

import { OrdersScreen } from "@/components/quiet/screens/orders/orders-screen";
import { getMyOrdersList } from "@/lib/data/attendee/orders";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) {
    redirect("/login?next=/orders");
  }

  const orders = await getMyOrdersList();
  return <OrdersScreen orders={orders} />;
}
