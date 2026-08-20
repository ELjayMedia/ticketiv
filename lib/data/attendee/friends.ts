// Source: user_friends + claimed-account social attendance RPC + user_connections
// + profiles + user_handles. Event activity is intentionally limited to the
// privacy-aware "friends going" contract; order and payment details never leave
// their owner scope.

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
  friends: Array<{
    id: string
    name: string
    handle: string | null
    mutualEventCount: number
  }>
  requests: Array<{
    id: string
    requesterId: string
    name: string
    handle: string
    requestedAt: string
  }>
  suggested: Array<{
    id: string
    name: string
    handle: string | null
    mutualLabel: string
  }>
  inviteHandle: string | null
}

type PendingRequestRow = {
  id: string
  requester_id: string
  requested_at: string
}

type SocialProfileRow = {
  handle: string
  display_name: string
}

type GoingSignalRow = {
  event_id: string
  friend_id: string
  friend_name: string | null
  friend_handle: string | null
}

type GoingEventRow = {
  id: string
  title: string
  starts_at: string
  ticket_types?: Array<{ price_cents: number | null }>
}

export async function getMyFriendsOverview(): Promise<FriendsOverview | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) return null

  const nowIso = new Date().toISOString()
  const [friendsRes, pendingRes, goingSignalRes, myHandleRes] = await Promise.all([
    supabase
      .from("user_friends")
      .select("friend_id, connected_at", { count: "exact" })
      .order("connected_at", { ascending: false }),
    supabase
      .from("user_connections")
      .select("id, requester_id, requested_at", { count: "exact" })
      .eq("recipient_id", user.id)
      .eq("status", "pending")
      .order("requested_at", { ascending: false }),
    // TICK-387: the old owner-executed view was removed from the exposed API.
    // This claimed-account RPC performs friendship/privacy/block checks inside
    // its narrow social contract and never returns ticket/order/payment fields.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)("fn_my_friends_going", {
      p_event_ids: null,
      p_from: nowIso,
      p_limit: 60,
    }),
    supabase.from("user_handles").select("handle").eq("user_id", user.id).maybeSingle(),
  ])

  if (goingSignalRes.error) {
    console.error("[friends] fn_my_friends_going:", goingSignalRes.error)
  }

  const totalFriends = friendsRes.count ?? 0
  const pendingRows = (pendingRes.data ?? []) as PendingRequestRow[]
  const pendingRequests = pendingRes.count ?? pendingRows.length
  const friendIds = (friendsRes.data ?? [])
    .map((r) => r.friend_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0)

  const goingSignals = ((goingSignalRes.data ?? []) as GoingSignalRow[]).filter(
    (row) => typeof row.event_id === "string" && typeof row.friend_id === "string",
  )
  const goingEventIds = Array.from(new Set(goingSignals.map((row) => row.event_id)))

  // Hydrate accepted-friend identity and the public event metadata separately.
  // This keeps user-scoped social attendance out of cached/public event views.
  const [profilesRes, handlesRes, goingEventsRes] = await Promise.all([
    friendIds.length > 0
      ? supabase
          .from("profiles")
          .select("user_id, display_name, name, surname")
          .in("user_id", friendIds)
      : Promise.resolve({ data: [] as Array<{ user_id: string; display_name: string | null; name: string | null; surname: string | null }> }),
    friendIds.length > 0
      ? supabase.from("user_handles").select("user_id, handle").in("user_id", friendIds)
      : Promise.resolve({ data: [] as Array<{ user_id: string; handle: string }> }),
    goingEventIds.length > 0
      ? supabase
          .from("events")
          .select("id, title, starts_at, ticket_types(price_cents)")
          .in("id", goingEventIds)
          .gte("starts_at", nowIso)
      : Promise.resolve({ data: [] as GoingEventRow[] }),
  ])

  const profById = new Map<string, { name: string; handle: string | null }>()
  for (const p of (profilesRes.data ?? []) as Array<{ user_id: string; display_name: string | null; name: string | null; surname: string | null }>) {
    const display =
      p.display_name?.trim() ||
      [p.name, p.surname].filter(Boolean).join(" ").trim() ||
      "Friend"
    profById.set(p.user_id, { name: display, handle: null })
  }
  for (const h of (handlesRes.data ?? []) as Array<{ user_id: string; handle: string }>) {
    const ex = profById.get(h.user_id)
    if (ex) ex.handle = h.handle
    else profById.set(h.user_id, { name: "Friend", handle: h.handle })
  }

  // Incoming requests need safe public identity even before a friendship is
  // accepted. Resolve requester IDs to handles first, then use the narrow social
  // profile RPC so phone/email/order fields never enter this payload.
  const requesterIds = pendingRows.map((r) => r.requester_id)
  const requestHandlesRes = requesterIds.length > 0
    ? await supabase.from("user_handles").select("user_id, handle").in("user_id", requesterIds)
    : { data: [] as Array<{ user_id: string; handle: string }> }

  const requestHandleById = new Map(
    ((requestHandlesRes.data ?? []) as Array<{ user_id: string; handle: string }>).map((row) => [row.user_id, row.handle]),
  )

  const requests = (await Promise.all(
    pendingRows.map(async (request) => {
      const handle = requestHandleById.get(request.requester_id)
      if (!handle) return null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.rpc as any)("get_social_public_profile", { p_handle: handle })
      const row = (Array.isArray(data) ? data[0] : data) as SocialProfileRow | null

      return {
        id: request.id,
        requesterId: request.requester_id,
        name: row?.display_name?.trim() || `@${handle}`,
        handle,
        requestedAt: request.requested_at,
      }
    }),
  )).filter((row): row is NonNullable<typeof row> => row !== null)

  const eventsById = new Map(
    ((goingEventsRes.data ?? []) as unknown as GoingEventRow[]).map((event) => [event.id, event]),
  )

  const goingRows = goingSignals
    .flatMap((row) => {
      const event = eventsById.get(row.event_id)
      return event ? [{ ...row, events: event }] : []
    })
    .sort((a, b) => a.events.starts_at.localeCompare(b.events.starts_at))

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
    eventTitle: r.events.title,
    whenAt: r.events.starts_at,
  }))

  const mutualByFriend = new Map<string, Set<string>>()
  for (const r of goingRows) {
    if (!friendIds.includes(r.friend_id)) continue
    const set = mutualByFriend.get(r.friend_id) ?? new Set<string>()
    set.add(r.event_id)
    mutualByFriend.set(r.friend_id, set)
  }

  const friends = friendIds.map((id) => {
    const prof = profById.get(id)
    return {
      id,
      name: prof?.name ?? "Friend",
      handle: prof?.handle ?? null,
      mutualEventCount: mutualByFriend.get(id)?.size ?? 0,
    }
  })

  return {
    totalFriends,
    pendingRequests,
    goingTogether,
    activity,
    friends,
    requests,
    suggested: [],
    inviteHandle: myHandleRes.data?.handle ?? null,
  }
}
