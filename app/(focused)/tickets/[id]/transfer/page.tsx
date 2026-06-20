import { notFound } from "next/navigation";
import { Transfer } from "@/components/quiet/screens/tickets/transfer";
import { getTicketById } from "@/lib/data/attendee/tickets";
import { mapTransferTicket, mapTransferFriends, type FriendRow } from "@/lib/mappers/transfer";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/**
 * `/tickets/[id]/transfer`
 *
 * `[id]` is the order_item_id. Ticket lookup is RLS-scoped to the current
 * buyer via v_my_tickets. Friends come from user_connections joined to
 * profiles + user_handles. v_event_friends_going flags which of those
 * friends already hold a ticket for the same event.
 */
export const metadata = { title: "Transfer ticket" };
export const dynamic = "force-dynamic";

async function fetchTransferData(eventId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { friends: [] as FriendRow[], goingIds: new Set<string>() };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { friends: [] as FriendRow[], goingIds: new Set<string>() };

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
    supabase
      .from("v_event_friends_going")
      .select("friend_id")
      .eq("event_id", eventId),
  ]);

  const handleByUser = new Map((handlesRes.data ?? []).map((h) => [h.user_id, h.handle]));
  const rows: FriendRow[] = (profilesRes.data ?? []).map((p) => ({
    friend_id: p.user_id,
    friend_name:
      [p.name, p.surname].filter(Boolean).join(" ") || p.display_name || null,
    friend_handle: handleByUser.get(p.user_id) ?? null,
  }));

  const goingIds = new Set<string>(
    (goingRes.data ?? [])
      .map((g) => g.friend_id)
      .filter((id): id is string => id !== null),
  );

  return { friends: rows, goingIds };
}

export default async function TransferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ticket = await getTicketById(id);
  if (!ticket) notFound();

  const { friends, goingIds } = await fetchTransferData(ticket.event_id);

  return (
    <div className="h-dvh">
      <Transfer
        ticket={mapTransferTicket(ticket)}
        friends={mapTransferFriends(friends, goingIds)}
      />
    </div>
  );
}
