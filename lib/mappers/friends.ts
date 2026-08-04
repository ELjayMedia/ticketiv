// Shape FriendsOverview → FriendsScreen props.

import { PHOTOS } from "@/lib/photos"
import type { FriendsOverview } from "@/lib/data/attendee/friends"
import { buildTicketivPublicUrl } from "@/lib/public-url"

const FACE_POOL = [
  PHOTOS.face_1,
  PHOTOS.face_2,
  PHOTOS.face_3,
  PHOTOS.face_4,
  PHOTOS.face_5,
  PHOTOS.face_6,
  PHOTOS.face_7,
  PHOTOS.face_8,
]

function avatarFor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return FACE_POOL[Math.abs(h) % FACE_POOL.length]
}

const WHEN_FMT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric" })

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 0) {
    const future = Math.abs(diffMs)
    const h = Math.floor(future / 3_600_000)
    if (h < 24) return `in ${h}h`
    return `in ${Math.floor(h / 24)}d`
  }
  const h = Math.floor(diffMs / 3_600_000)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export interface FriendsScreenProps {
  totalFriends: number
  pendingRequests: number
  goingTogether: {
    eventId: string
    eventTitle: string
    whenLabel: string
    fromPriceMinor: number
    friendPhotos: string[]
    friendNames: string[]
    totalCount: number
  } | null
  activity: Array<{
    id: string
    name: string
    photo: string
    action: string
    what: string
    whenAgo: string
    icon: "ticket" | "spark" | "heart" | "plus"
  }>
  friends: Array<{
    id: string
    name: string
    photo: string
    handle: string | null
    mutualLabel: string
  }>
  suggested: Array<{
    id: string
    name: string
    photo: string
    mutualLabel: string
  }>
  inviteLink: string
  inviteReward: string
}

// Invite links must copy as real, working URLs. Prefer the configured public
// origin; fall back to the production domain — never a placeholder host.
export function mapFriends(o: FriendsOverview, host?: string | null): FriendsScreenProps {
  const hero = o.goingTogether
  const goingTogether = hero
    ? {
        eventId: hero.eventId,
        eventTitle: hero.eventTitle,
        whenLabel: WHEN_FMT.format(new Date(hero.whenLabel)),
        fromPriceMinor: hero.fromPriceCents,
        friendPhotos: hero.friendNames.map((n, i) => avatarFor(`${hero.eventId}:${n}:${i}`)),
        friendNames: hero.friendNames,
        totalCount: hero.totalCount,
      }
    : null

  return {
    totalFriends: o.totalFriends,
    pendingRequests: o.pendingRequests,
    goingTogether,
    activity: o.activity.map((a) => ({
      id: a.id,
      name: a.name,
      photo: avatarFor(a.friendId),
      action: "is going to",
      what: a.eventTitle,
      whenAgo: timeAgo(a.whenAt),
      icon: "spark" as const,
    })),
    friends: o.friends.map((f) => ({
      id: f.id,
      name: f.name,
      photo: avatarFor(f.id),
      handle: f.handle,
      mutualLabel:
        f.mutualEventCount > 0
          ? `${f.mutualEventCount} shared event${f.mutualEventCount === 1 ? "" : "s"}`
          : "No shared events yet",
    })),
    suggested: o.suggested.map((s) => ({
      id: s.id,
      name: s.name,
      photo: avatarFor(s.id),
      mutualLabel: s.mutualLabel,
    })),
    inviteLink: o.inviteHandle
      ? buildTicketivPublicUrl(`/?ref=${encodeURIComponent(o.inviteHandle)}`, host)
      : buildTicketivPublicUrl("", host),
    inviteReward: "get E100 off when 3 join",
  }
}
