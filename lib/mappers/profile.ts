// Map MyProfile → ProfileScreen props (Quiet). The screen falls back to
// initials when there is no avatar URL.

import type { MyProfile } from "@/lib/data/attendee/profile"

export interface ProfileUserProp {
  name: string
  handle: string
  photo: string
  joinedLabel: string
  stats: { events: number; friends: number; following: number }
  email: string
  savedPaymentMethods: number
  remindersEnabled: boolean
  language: string
  upcomingTickets: number
  favouritesCount: number
  pendingTransfers: number
  unreadNotifications: number
}

const JOINED_FMT = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" })

export function mapProfile(p: MyProfile): ProfileUserProp {
  const joined = p.joinedAt ? new Date(p.joinedAt) : null
  return {
    name: p.name,
    handle: p.handle ?? p.email?.split("@")[0] ?? "you",
    photo: p.avatarUrl ?? "",
    joinedLabel: joined ? `joined ${JOINED_FMT.format(joined)}` : "",
    stats: {
      events: p.upcomingTickets,
      friends: p.friendsCount,
      following: p.followingCount,
    },
    email: p.email ?? "",
    savedPaymentMethods: p.savedPaymentMethods,
    remindersEnabled: p.remindersEnabled,
    language: p.language,
    upcomingTickets: p.upcomingTickets,
    favouritesCount: p.favouritesCount,
    pendingTransfers: p.pendingTransfers,
    unreadNotifications: p.unreadNotifications,
  }
}