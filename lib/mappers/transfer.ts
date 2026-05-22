/**
 * Map v_my_tickets (the ticket) + user_friends + profiles into the Transfer
 * screen's props. Friends list is RLS-scoped through user_friends; profile
 * names come from the profiles table. Avatars fall back to the photo
 * placeholder palette since profiles.avatar_url doesn't exist yet.
 */

import { PHOTOS } from "@/lib/photos";
import { formatEventDate, formatTimeRange } from "@/lib/format";
import type { MyTicketsView } from "@/lib/schemas/views";

export interface FriendRow {
  friend_id: string;
  friend_name: string | null;
  friend_handle: string | null;
}

export interface TransferTicketProp {
  id: string;
  eventTitle: string;
  eventPhoto: string;
  seatLabel: string;
  whenLabel: string;
  typeLabel: string;
  priceMinor: number;
}

export interface TransferFriendProp {
  id: string;
  name: string;
  handle: string;
  photo: string;
  meta: string;
  going?: boolean;
}

const PALETTE = [PHOTOS.face_1, PHOTOS.face_2, PHOTOS.face_3, PHOTOS.face_5, PHOTOS.face_6, PHOTOS.face_7, PHOTOS.face_8];

export function mapTransferTicket(row: MyTicketsView): TransferTicketProp {
  const start = row.event_starts_at ? new Date(row.event_starts_at) : null;
  return {
    id: row.order_item_id,
    eventTitle: row.event_title,
    eventPhoto: row.cover_image_url ?? PHOTOS.dj_set,
    seatLabel: row.ticket_type_name ?? "General",
    whenLabel: start ? `${formatEventDate(start)} · ${formatTimeRange(start)}` : "Date TBA",
    typeLabel: row.ticket_type_name ?? "General",
    priceMinor: row.price_cents ?? 0,
  };
}

export function mapTransferFriends(rows: FriendRow[], goingIds: Set<string> = new Set()): TransferFriendProp[] {
  return rows.map((r, i) => ({
    id: r.friend_id,
    name: r.friend_name ?? r.friend_handle ?? "Friend",
    handle: r.friend_handle ?? r.friend_id.slice(0, 6),
    photo: PALETTE[i % PALETTE.length],
    meta: goingIds.has(r.friend_id) ? "Going to this event" : "Friend",
    going: goingIds.has(r.friend_id),
  }));
}
