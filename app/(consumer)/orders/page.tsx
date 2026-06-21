import { OrdersScreen } from "@/components/quiet/screens/orders/orders-screen";
import { getMyOrdersList } from "@/lib/data/attendee/orders";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await getMyOrdersList();
  return <OrdersScreen orders={orders} />;
}
