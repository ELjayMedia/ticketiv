import { getOrdersByEmail, listOrders, type OrderRecord } from "../../orders"

type SupabaseClient = {
  auth: {
    getUser: () => Promise<{
      data: {
        user:
          | ({
              email?: string | null
              app_metadata?: { role?: string }
              user_metadata?: { role?: string }
            } & Record<string, unknown>)
          | null
      } | null
      error: Error | null
    }>
  }
}

type OrdersFetcher = (email: string) => OrderRecord[]
type AllOrdersFetcher = () => OrderRecord[]

type Dependencies = {
  fetchOrders?: OrdersFetcher
  fetchAllOrders?: AllOrdersFetcher
}

export type OrdersHandlerResult = {
  status: number
  body: Record<string, unknown>
}

export async function fetchOrdersForCurrentUser(
  supabase: SupabaseClient,
  { fetchOrders = getOrdersByEmail, fetchAllOrders = listOrders }: Dependencies = {},
): Promise<OrdersHandlerResult> {
  const { data, error } = await supabase.auth.getUser()
  const user = data?.user

  if (error || !user) {
    return { status: 401, body: { error: "Unauthorized" } }
  }

  const role = (user.app_metadata?.role ?? user.user_metadata?.role)?.toLowerCase()
  const isOrganizer = role === "organizer" || role === "admin"

  if (isOrganizer) {
    return { status: 200, body: { orders: fetchAllOrders() } }
  }

  const userEmail = user.email
  if (!userEmail) {
    return { status: 401, body: { error: "Unauthorized" } }
  }

  type SanitizedOrder = Omit<OrderRecord, "tickets">
  const sanitizedOrders: SanitizedOrder[] = fetchOrders(userEmail).map(({ tickets, ...order }) => order)

  return { status: 200, body: { orders: sanitizedOrders } }
}
