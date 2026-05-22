// Source: user_friends + v_event_friends_going + user_connections + profiles
// + user_handles. event_favourites and v_my_tickets of friends are owner-only
// under RLS, so the activity feed is derived from v_event_friends_going
// ("going to") only — additional activity types arrive when their views land.

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface FriendsOverview {
  totalFriends: number
  pendingRequests: number
  goingTogether: {
    eventId: string
    eventTitle: string
    whenLabel: string
    fromPriceCents: number
    friendPhotos: string[]
    friendNames: string[]
    totalCount: number
  } | null
  activity: Array<{
    id: string
    friendId: string
    name: string
    handle: string | null
    eventId: string
    eventTitle: string
    whenAt: string
  }>
  suggested: Array<{
    id: string
    name: string
    handle: string | null
    mutualLabel: string
  }>
  inviteHandle: string | null
}

export async function getMyFriendsOverview(): Promise<FriendsOverview | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [friendsRes, pendingRes, goingRes, myHandleRes] = await Promise.all([
    supabase
      .from("user_friends")
      .select("friend_id, connected_at", { count: "exact" })
      .order("connected_at", { ascending: false }),
    supabase
      .from("user_connections")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("v_event_friends_going")
      .select(
        "event_id, friend_id, friend_name, friend_handle, events:events!inner(id, title, starts_at, ticket_types(price_cents))",
      )
      .gte("events.starts_at", new Date().toISOString())
      .order("events.starts_at", { ascending: true })
      .limit(60),
    supabase.from("user_handles").select("handle").eq("user_id", user.id).maybeSingle(),
  ])

  const totalFriends = friendsRes.count ?? 0
  const pendingRequests = pendingRes.count ?? 0
  const goingRows = (goingRes.data ?? []) as unknown as Array<{
    event_id: string
    friend_id: string
    friend_name: string | null
    friend_handle: string | null
    events: {
      id: string
      title: string
      starts_at: string
      ticket_types?: Array<{ price_cents: number | null }>
    } | null
  }>

  // Group by event for the "going together" hero.
  const grouped = new Map<
    string,
    {
      eventId: string
      title: string
      starts_at: string
      fromPriceCents: number
      friends: Array<{ id: string; name: string | null; handle: string | null }>
    }
  >()

  for (const r of goingRows) {
    if (!r.events) continue
    const ev = r.events
    const prices = (ev.ticket_types ?? [])
      .map((t) => t.price_cents)
      .filter((p): p is number => typeof p === "number" && p >= 0)
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0

    const existing = grouped.get(ev.id)
    if (existing) {
      if (!existing.friends.some((f) => f.id === r.friend_id)) {
        existing.friends.push({ id: r.friend_id, name: r.friend_name, handle: r.friend_handle })
      }
    } else {
      grouped.set(ev.id, {
        eventId: ev.id,
        title: ev.title,
        starts_at: ev.starts_at,
        fromPriceCents: minPrice,
        friends: [
          { id: r.friend_id, name: r.friend_name, handle: r.friend_handle },
        ],
      })
    }
  }

  const sortedGroups = [...grouped.values()].sort((a, b) => {
    if (b.friends.length !== a.friends.length) return b.friends.length - a.friends.length
    return a.starts_at.localeCompare(b.starts_at)
  })

  const hero = sortedGroups.find((g) => g.friends.length >= 2) ?? sortedGroups[0] ?? null
  const goingTogether = hero
    ? {
        eventId: hero.eventId,
        eventTitle: hero.title,
        whenLabel: hero.starts_at,
        fromPriceCents: hero.fromPriceCents,
        friendPhotos: [],
        friendNames: hero.friends.slice(0, 3).map((f) => f.name ?? "Friend"),
        totalCount: hero.friends.length,
      }
    : null

  const activity = goingRows.slice(0, 8).map((r) => ({
    id: `${r.event_id}:${r.friend_id}`,
    friendId: r.friend_id,
    name: r.friend_name ?? "Friend",
    handle: r.friend_handle,
    eventId: r.event_id,
    eventTitle: r.events?.title ?? "Event",
    whenAt: r.events?.starts_at ?? new Date().toISOString(),
  }))

  return {
    totalFriends,
    pendingRequests,
    goingTogether,
    activity,
    suggested: [],
    inviteHandle: myHandleRes.data?.handle ?? null,
  }
}
