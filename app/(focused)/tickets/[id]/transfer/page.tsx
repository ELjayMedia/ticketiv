import { notFound } from "next/navigation";
import { Transfer } from "@/components/quiet/screens/tickets/transfer";
import { getTicketById } from "@/lib/data/attendee/tickets";
import { mapTransferTicket, mapTransferFriends, type FriendRow } from "@/lib/mappers/transfer";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * `/tickets/[id]/transfer`
 *
 * `[id]` is the order_item_id. Ticket lookup is owner-scoped through the
 * attendee ticket data layer. Friends come from accepted user_connections
 * joined to safe public profile identity. TICK-387 uses the claimed-account
 * social RPC to flag friends who already hold a ticket for this event; the old
 * exposed friends-going view was intentionally removed.
 */
export const metadata = { title: "Transfer ticket" };
export const dynamic = "force-dynamic";

type GoingRow = { friend_id: string };

const ASSIGNMENT_RETURN_PATH = /^\/orders\/[0-9a-fA-F-]{36}\/assign$/;

function normalizeReturnTo(value: string | string[] | undefined): string | null {
  const target = typeof value === "string" ? value : null;
  if (!target || !ASSIGNMENT_RETURN_PATH.test(target)) return null;
  return target;
}

async function fetchTransferData(eventId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { friends: [] as FriendRow[], goingIds: new Set<string>() };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    return { friends: [] as FriendRow[], goingIds: new Set<string>() };
  }

  const { data: connections } = await supabase
    .from("user_connections")
    .select("requester_id, recipient_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

  const friendIds = (connections ?? [])
    .map((c) => (c.requester_id === user.id ? c.recipient_id : c.requester_id))
    .filter((id): id is string => Boolean(id) && id !== user.id);

  if (friendIds.length === 0) return { friends: [] as FriendRow[], goingIds: new Set<string>() };

  const [profilesRes, handlesRes, goingRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, name, surname, display_name")
      .in("user_id", friendIds),
    supabase
      .from("user_handles")
      .select("user_id, handle")
      .in("user_id", friendIds),
    // TICK-387 RPC is newer than the generated Database types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)("fn_my_friends_going", {
      p_event_ids: [eventId],
      p_from: null,
      p_limit: 100,
    }),
  ]);

  if (goingRes.error) {
    console.error("[ticket-transfer] fn_my_friends_going:", goingRes.error);
  }

  const handleByUser = new Map((handlesRes.data ?? []).map((h) => [h.user_id, h.handle]));
  const rows: FriendRow[] = (profilesRes.data ?? []).map((p) => ({
    friend_id: p.user_id,
    friend_name:
      [p.name, p.surname].filter(Boolean).join(" ") || p.display_name || null,
    friend_handle: handleByUser.get(p.user_id) ?? null,
  }));

  const goingIds = new Set<string>(
    ((goingRes.data ?? []) as GoingRow[])
      .map((g) => g.friend_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  return { friends: rows, goingIds };
}

export default async function TransferPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { id } = await params;
  const { returnTo: rawReturnTo } = await searchParams;
  const returnTo = normalizeReturnTo(rawReturnTo);
  const ticket = await getTicketById(id);
  if (!ticket) notFound();

  const { friends, goingIds } = await fetchTransferData(ticket.event_id);

  return (
    <div className="h-dvh">
      <Transfer
        ticket={mapTransferTicket(ticket)}
        friends={mapTransferFriends(friends, goingIds)}
        returnTo={returnTo}
      />
    </div>
  );
}
