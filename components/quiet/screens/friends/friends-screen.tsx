"use client"

import * as React from "react"
import Link from "next/link"

import {
  searchPeopleAction,
  type FriendRelationshipState,
  type PeopleSearchResult,
} from "@/app/(consumer)/friends/actions"
import { FriendActions } from "@/components/quiet/screens/profile/friend-actions"
import { Button } from "@/components/quiet/ui/button"
import { Card } from "@/components/quiet/ui/card"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import { Avatar, AvatarStack, Segmented } from "@/components/quiet/ui/primitives"
import { formatPrice } from "@/lib/format"

type Tab = "activity" | "friends" | "requests"

interface FriendsScreenProps {
  totalFriends?: number
  pendingRequests?: number
  goingTogether?: GoingTogether | null
  activity?: ActivityItem[]
  friends?: FriendRow[]
  suggested?: unknown[]
  inviteLink?: string
  inviteReward?: string
  requests?: FriendRequest[]
}

interface FriendRow {
  id: string
  name: string
  photo: string
  handle: string | null
  mutualLabel: string
}

interface FriendRequest {
  id: string
  name: string
  photo: string
  handle: string
  mutualLabel: string
}

interface GoingTogether {
  eventId: string
  eventTitle: string
  whenLabel: string
  fromPriceMinor: number
  friendPhotos: string[]
  friendNames: string[]
  totalCount: number
}

interface ActivityItem {
  id: string
  name: string
  photo: string
  handle: string | null
  action: string
  what: string
  whenAgo: string
  icon: IconName
}

export function FriendsScreen({
  totalFriends = 0,
  pendingRequests = 0,
  goingTogether = null,
  activity = [],
  friends = [],
  inviteLink = "",
  inviteReward = "",
  requests = [],
}: FriendsScreenProps = {}) {
  const [tab, setTab] = React.useState<Tab>("activity")
  const [findOpen, setFindOpen] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  function copyInviteLink() {
    if (!inviteLink) return
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteLink).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => window.prompt("Copy your invite link:", inviteLink))
      return
    }
    window.prompt("Copy your invite link:", inviteLink)
  }

  return (
    <div className="mx-auto max-w-[480px] bg-bg pb-24">
      <div className="h-14" />

      <header className="flex items-end gap-2 px-5 pb-3 pt-2">
        <div className="flex flex-1 flex-col">
          <span className="text-label">Your circle</span>
          <span className="text-h1 mt-0.5">Friends · {totalFriends}</span>
        </div>
        <Link
          href="/friends/settings"
          aria-label="Friends privacy settings"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
        >
          <Icon name="settings" size={18} />
        </Link>
        <Button
          type="button"
          variant="accent"
          size="xs"
          onClick={() => setFindOpen((open) => !open)}
        >
          <Icon name="plus" size={14} /> Find people
        </Button>
      </header>

      {findOpen ? <FindPeoplePanel /> : null}

      <div className="px-5 pb-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "activity", label: "Activity" },
            { value: "friends", label: "Friends" },
            { value: "requests", label: `Requests · ${pendingRequests}` },
          ]}
        />
      </div>

      {tab === "activity" ? (
        <ActivityTab
          goingTogether={goingTogether}
          activity={activity}
          inviteLink={inviteLink}
          inviteReward={inviteReward}
          copied={copied}
          onCopyInvite={copyInviteLink}
        />
      ) : null}

      {tab === "friends" ? <FriendsListTab friends={friends} /> : null}

      {tab === "requests" ? (
        <RequestsTab requests={requests} pendingRequests={pendingRequests} />
      ) : null}
    </div>
  )
}

function FindPeoplePanel() {
  const [query, setQuery] = React.useState("")
  const [people, setPeople] = React.useState<PeopleSearchResult[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [searched, setSearched] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = query.trim()
    if (q.length < 2) return

    setError(null)
    startTransition(async () => {
      const result = await searchPeopleAction(q)
      setSearched(true)
      if (!result.ok) {
        setPeople([])
        setError(result.error ?? "Could not search people.")
        return
      }
      setPeople(result.people)
    })
  }

  return (
    <section className="px-5 pb-4">
      <Card className="flex flex-col gap-3 p-3.5">
        <div>
          <div className="text-[13px] font-semibold">Find people</div>
          <p className="mt-0.5 font-mono text-[10px] text-ink-3">
            Search Ticketiv by name or @username. Phone contacts arrive in the next delivery phase.
          </p>
        </div>

        <form onSubmit={submit} className="flex gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2">
            <Icon name="search" size={14} className="shrink-0 text-ink-3" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or @username"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
            />
          </div>
          <Button type="submit" variant="default" size="sm" disabled={pending || query.trim().length < 2}>
            {pending ? "Finding…" : "Find"}
          </Button>
        </form>

        {error ? <p className="font-mono text-[10px] text-danger">{error}</p> : null}

        {searched && !pending && people.length === 0 && !error ? (
          <p className="rounded-[var(--radius)] bg-bg px-3 py-4 text-center font-mono text-[10px] text-ink-3">
            No eligible Ticketiv profiles match that search.
          </p>
        ) : null}

        {people.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line">
            {people.map((person) => (
              <li key={person.handle} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Link href={`/@${person.handle}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Avatar src={person.avatarUrl ?? ""} label={initials(person.displayName)} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">{person.displayName}</div>
                    <div className="truncate font-mono text-[10px] text-ink-3">@{person.handle}</div>
                  </div>
                </Link>
                <CompactRelationshipAction person={person} />
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </section>
  )
}

function CompactRelationshipAction({ person }: { person: PeopleSearchResult }) {
  const state = person.relationshipState as FriendRelationshipState
  if (state === "friends") {
    return <span className="font-mono text-[10px] font-semibold text-accent">Friends ✓</span>
  }
  if (state === "outgoing_pending") {
    return <span className="font-mono text-[10px] font-semibold text-ink-3">Requested</span>
  }
  if (state === "incoming_pending") {
    return (
      <Link href={`/@${person.handle}`} className="font-mono text-[10px] font-semibold text-accent">
        Respond ›
      </Link>
    )
  }
  if (!person.canRequest) {
    return <span className="font-mono text-[10px] text-ink-3">Requests off</span>
  }
  return (
    <Link href={`/@${person.handle}`} className="font-mono text-[10px] font-semibold text-accent">
      Add ›
    </Link>
  )
}

function ActivityTab({
  goingTogether,
  activity,
  inviteLink,
  inviteReward,
  copied,
  onCopyInvite,
}: {
  goingTogether: GoingTogether | null
  activity: ActivityItem[]
  inviteLink: string
  inviteReward: string
  copied: boolean
  onCopyInvite: () => void
}) {
  return (
    <>
      {goingTogether ? (
        <section className="px-5 pb-4">
          <Card className="border-accent bg-accent-soft p-3.5">
            <div className="flex items-center gap-2.5">
              <AvatarStack>
                {goingTogether.friendPhotos.map((photo, index) => (
                  <Avatar key={`${photo}:${index}`} src={photo} size={28} className="ring-accent-soft" />
                ))}
              </AvatarStack>
              <div className="flex flex-1 flex-col">
                <span className="text-[13px] font-semibold">
                  {goingTogether.friendNames.join(", ")}
                  {goingTogether.totalCount > goingTogether.friendNames.length
                    ? ` + ${goingTogether.totalCount - goingTogether.friendNames.length}`
                    : ""} going to
                </span>
                <Link href={`/events/${goingTogether.eventId}`} className="text-[13px] font-semibold text-accent">
                  {goingTogether.eventTitle} · {goingTogether.whenLabel}
                </Link>
              </div>
            </div>
            <Link
              href={`/events/${goingTogether.eventId}/checkout`}
              className="mt-3 flex w-full items-center justify-center rounded-[var(--radius)] bg-accent px-3 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
            >
              Join them — book {formatPrice(goingTogether.fromPriceMinor)}
            </Link>
          </Card>
        </section>
      ) : null}

      <section className="px-5 pb-4">
        <div className="text-label mb-2">From your friends</div>
        {activity.length === 0 ? (
          <Card className="border-dashed p-5 text-center">
            <p className="font-mono text-[10px] text-ink-3">
              Friend activity will appear here when people in your circle are going to events.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {activity.map((item) => (
              <li key={item.id} className="flex items-center gap-2.5 py-1">
                <div className="relative">
                  <Avatar src={item.photo} size={36} />
                  <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-surface bg-accent-soft text-accent">
                    <Icon name={item.icon} size={9} />
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-[13px]">
                    {item.handle ? (
                      <Link href={`/@${item.handle}`} className="font-semibold hover:underline">
                        {item.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{item.name}</span>
                    )}{" "}
                    <span className="text-ink-3">{item.action}</span>{" "}
                    <span className="font-semibold">{item.what}</span>
                  </p>
                  <span className="font-mono text-[10px] text-ink-3">{item.whenAgo}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {inviteLink ? (
        <section className="px-5 pb-4">
          <Card className="p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon name="share" size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold">Someone not on Ticketiv?</div>
                <div className="font-mono text-[10px] text-ink-3">{inviteReward}</div>
              </div>
              <Button type="button" variant="default" size="xs" onClick={onCopyInvite}>
                <Icon name="copy" size={12} /> {copied ? "Copied" : "Invite"}
              </Button>
            </div>
          </Card>
        </section>
      ) : null}
    </>
  )
}

function FriendsListTab({ friends }: { friends: FriendRow[] }) {
  if (friends.length === 0) {
    return (
      <div className="mx-5 mt-4 rounded-[var(--radius-lg)] border border-dashed border-line-2 px-6 py-10 text-center">
        <span className="font-mono text-[11px] text-ink-3">No friends yet — find someone you know.</span>
      </div>
    )
  }

  return (
    <section className="px-5 pt-1">
      <div className="text-label mb-2">{friends.length} friend{friends.length === 1 ? "" : "s"}</div>
      <ul className="flex flex-col gap-2">
        {friends.map((friend) => (
          <li key={friend.id}>
            <Card className="flex items-center gap-3 p-3" flat>
              <Avatar src={friend.photo} size={40} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-semibold">{friend.name}</span>
                <span className="truncate font-mono text-[11px] text-ink-3">
                  {friend.handle ? `@${friend.handle} · ` : ""}{friend.mutualLabel}
                </span>
              </div>
              {friend.handle ? (
                <Link
                  href={`/@${friend.handle}`}
                  className="inline-flex items-center gap-1 rounded-[var(--radius)] border border-line-2 px-2.5 py-1 text-[12px] font-semibold hover:bg-bg"
                >
                  View
                </Link>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}

function RequestsTab({
  requests,
  pendingRequests,
}: {
  requests: FriendRequest[]
  pendingRequests: number
}) {
  if (pendingRequests === 0 || requests.length === 0) {
    return (
      <div className="mx-5 mt-4 rounded-[var(--radius-lg)] border border-dashed border-line-2 px-6 py-10 text-center">
        <span className="font-mono text-[11px] text-ink-3">No pending friend requests.</span>
      </div>
    )
  }

  return (
    <section className="px-5 pt-1">
      <div className="text-label mb-2">{pendingRequests} pending request{pendingRequests === 1 ? "" : "s"}</div>
      <ul className="flex flex-col gap-2">
        {requests.map((request) => (
          <li key={request.id}>
            <Card className="flex flex-col gap-3 p-3.5">
              <div className="flex items-center gap-3">
                <Link href={`/@${request.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar src={request.photo} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">{request.name}</div>
                    <div className="truncate font-mono text-[10px] text-ink-3">
                      @{request.handle} · {request.mutualLabel}
                    </div>
                  </div>
                </Link>
              </div>
              <FriendActions handle={request.handle} initialState="incoming_pending" />
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
