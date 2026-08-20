"use client"

import * as React from "react"
import Link from "next/link"

import {
  matchContactsAction,
  searchPeopleAction,
  sendFriendRequestAction,
  type ContactMatchResult,
  type FriendRelationshipState,
  type PeopleSearchResult,
} from "@/app/(consumer)/friends/actions"
import { Button } from "@/components/quiet/ui/button"
import { Card } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { Avatar } from "@/components/quiet/ui/primitives"

type ContactPickerProperty = "name" | "tel"

interface ContactPickerContact {
  name?: string[]
  tel?: string[]
}

interface ContactPickerManager {
  select(
    properties: ContactPickerProperty[],
    options: { multiple: boolean },
  ): Promise<ContactPickerContact[]>
}

type NavigatorWithContacts = Navigator & { contacts?: ContactPickerManager }

interface SelectedPhone {
  contactKey: string
  contactName: string
  phone: string
}

interface MatchedContact {
  contactKey: string
  contactName: string
  profile: ContactMatchResult
}

interface UnmatchedContact {
  contactKey: string
  contactName: string
  phone: string
}

export function ContactDiscoveryScreen({
  inviteLink,
  discoverByPhone,
}: {
  inviteLink: string
  discoverByPhone: boolean
}) {
  const [supported, setSupported] = React.useState<boolean | null>(null)
  const [picked, setPicked] = React.useState(false)
  const [matched, setMatched] = React.useState<MatchedContact[]>([])
  const [unmatched, setUnmatched] = React.useState<UnmatchedContact[]>([])
  const [contactError, setContactError] = React.useState<string | null>(null)
  const [contactPending, startContactTransition] = React.useTransition()

  React.useEffect(() => {
    const nav = navigator as NavigatorWithContacts
    setSupported(Boolean(window.isSecureContext && nav.contacts?.select))
  }, [])

  async function chooseContacts() {
    const nav = navigator as NavigatorWithContacts
    if (!window.isSecureContext || !nav.contacts?.select) {
      setSupported(false)
      return
    }

    setContactError(null)

    try {
      const contacts = await nav.contacts.select(["name", "tel"], { multiple: true })
      const selectedPhones = contacts
        .flatMap((contact, contactIndex) => {
          const contactName = contact.name?.find((value) => value.trim())?.trim() || `Contact ${contactIndex + 1}`
          const contactKey = `${contactIndex}:${contactName}`
          return (contact.tel ?? [])
            .filter((phone) => phone.trim())
            .map((phone) => ({ contactKey, contactName, phone: phone.trim() }))
        })
        .slice(0, 100)

      setPicked(true)
      if (selectedPhones.length === 0) {
        setMatched([])
        setUnmatched([])
        setContactError("The selected contacts did not include phone numbers.")
        return
      }

      startContactTransition(async () => {
        const result = await matchContactsAction(selectedPhones.map((entry) => entry.phone))
        if (!result.ok) {
          setMatched([])
          setUnmatched(uniqueUnmatched(selectedPhones, new Set()))
          setContactError(result.error ?? "Could not match the selected contacts.")
          return
        }

        const matchedRows = result.matches.flatMap((profile) => {
          const selected = selectedPhones[profile.inputIndex - 1]
          if (!selected) return []
          return [{
            contactKey: selected.contactKey,
            contactName: selected.contactName,
            profile,
          } satisfies MatchedContact]
        })

        const dedupedMatches = dedupeMatches(matchedRows)
        const matchedContactKeys = new Set(dedupedMatches.map((row) => row.contactKey))
        setMatched(dedupedMatches)
        setUnmatched(uniqueUnmatched(selectedPhones, matchedContactKeys))
      })
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ""
      if (name === "AbortError") return
      console.error("[friends] contact picker:", error)
      setContactError("Ticketiv could not open your contact picker. You can still search by name or @username below.")
    }
  }

  async function invite(contact: UnmatchedContact) {
    const text = `Join me on Ticketiv to discover events and keep tickets together.`

    try {
      if (navigator.share) {
        await navigator.share({ title: "Join me on Ticketiv", text, url: inviteLink })
        return
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
    }

    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      const separator = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "&" : "?"
      window.location.href = `sms:${encodeURIComponent(contact.phone)}${separator}body=${encodeURIComponent(`${text} ${inviteLink}`)}`
      return
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(inviteLink)
      setContactError("Invite link copied. Share it with your contact in your preferred messaging app.")
      return
    }

    window.prompt("Copy your Ticketiv invite link:", inviteLink)
  }

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-5 px-5 pb-24 pt-20">
      <header className="flex items-start gap-3">
        <Link
          href="/friends"
          aria-label="Back to friends"
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-surface"
        >
          <Icon name="chevL" size={18} />
        </Link>
        <div className="flex flex-col gap-1">
          <span className="text-label">Friends</span>
          <h1 className="text-h1">Find people</h1>
          <p className="text-[13px] leading-relaxed text-ink-3">
            Choose people from your contacts or search Ticketiv directly. Contact phone numbers are used only for this match and are not shown in Ticketiv.
          </p>
        </div>
      </header>

      {!discoverByPhone ? (
        <Card className="flex items-start gap-3 border-accent/30 bg-accent-soft p-3.5">
          <Icon name="settings" size={16} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">Your own phone discovery is off</div>
            <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-ink-3">
              You can still find people who opted in. Turn this on only if you want people who already have your number to find you too.
            </p>
          </div>
          <Link href="/friends/settings" className="font-mono text-[10px] font-semibold text-accent">
            Privacy ›
          </Link>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="plus" size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold">From your contacts</div>
            <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-ink-3">
              Ticketiv asks only when you tap the button. Your browser lets you choose exactly which contacts to share for matching.
            </p>
          </div>
        </div>

        {supported === false ? (
          <div className="rounded-[var(--radius)] border border-line bg-bg px-3 py-3">
            <p className="text-[12px] font-medium">Contact selection is not supported in this browser.</p>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-ink-3">
              Nothing is blocked: use Ticketiv search below, or share your invite link with someone directly.
            </p>
          </div>
        ) : (
          <Button type="button" variant="accent" size="md" disabled={contactPending || supported === null} onClick={chooseContacts}>
            <Icon name="plus" size={14} /> {contactPending ? "Matching…" : picked ? "Choose contacts again" : "Choose contacts"}
          </Button>
        )}

        <p className="font-mono text-[9px] leading-relaxed text-ink-3">
          Privacy: Ticketiv does not upload your whole address book, does not save selected contact numbers, and does not return another user's phone number.
        </p>
        {contactError ? <p role="status" className="font-mono text-[10px] text-danger">{contactError}</p> : null}
      </Card>

      {matched.length > 0 ? (
        <section className="flex flex-col gap-2">
          <div className="text-label">On Ticketiv · {matched.length}</div>
          <Card className="divide-y divide-line overflow-hidden p-0">
            {matched.map((row) => (
              <div key={`${row.contactKey}:${row.profile.handle}`} className="flex items-center gap-3 px-3.5 py-3">
                <Link href={`/@${row.profile.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar src={row.profile.avatarUrl ?? ""} label={initials(row.profile.displayName)} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">{row.profile.displayName}</div>
                    <div className="truncate font-mono text-[10px] text-ink-3">
                      @{row.profile.handle} · saved as {row.contactName}
                    </div>
                  </div>
                </Link>
                <RelationshipAction person={row.profile} />
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      {picked && !contactPending && unmatched.length > 0 ? (
        <section className="flex flex-col gap-2">
          <div className="text-label">Invite to Ticketiv · {unmatched.length}</div>
          <Card className="divide-y divide-line overflow-hidden p-0">
            {unmatched.map((contact) => (
              <div key={contact.contactKey} className="flex items-center gap-3 px-3.5 py-3">
                <Avatar label={initials(contact.contactName)} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{contact.contactName}</div>
                  <div className="font-mono text-[10px] text-ink-3">No eligible Ticketiv match</div>
                </div>
                <Button type="button" variant="default" size="xs" onClick={() => void invite(contact)}>
                  <Icon name="share" size={12} /> Invite
                </Button>
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      {picked && !contactPending && matched.length === 0 && unmatched.length === 0 && !contactError ? (
        <Card className="border-dashed p-5 text-center">
          <p className="font-mono text-[10px] text-ink-3">No phone contacts were selected.</p>
        </Card>
      ) : null}

      <PeopleSearch />
    </main>
  )
}

function PeopleSearch() {
  const [query, setQuery] = React.useState("")
  const [people, setPeople] = React.useState<PeopleSearchResult[]>([])
  const [searched, setSearched] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
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
    <section className="flex flex-col gap-2">
      <div className="text-label">Search Ticketiv</div>
      <Card className="flex flex-col gap-3 p-4">
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
          <div className="divide-y divide-line">
            {people.map((person) => (
              <div key={person.handle} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Link href={`/@${person.handle}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Avatar src={person.avatarUrl ?? ""} label={initials(person.displayName)} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">{person.displayName}</div>
                    <div className="truncate font-mono text-[10px] text-ink-3">@{person.handle}</div>
                  </div>
                </Link>
                <RelationshipAction person={person} />
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </section>
  )
}

function RelationshipAction({ person }: { person: PeopleSearchResult | ContactMatchResult }) {
  const [state, setState] = React.useState<FriendRelationshipState>(person.relationshipState)
  const [pending, startTransition] = React.useTransition()

  if (state === "friends") {
    return <span className="font-mono text-[10px] font-semibold text-accent">Friends ✓</span>
  }
  if (state === "outgoing_pending") {
    return <span className="font-mono text-[10px] font-semibold text-ink-3">Requested</span>
  }
  if (state === "incoming_pending") {
    return <Link href={`/@${person.handle}`} className="font-mono text-[10px] font-semibold text-accent">Respond ›</Link>
  }
  if (!person.canRequest || state === "unavailable") {
    return <span className="font-mono text-[10px] text-ink-3">Requests off</span>
  }

  return (
    <Button
      type="button"
      variant="default"
      size="xs"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await sendFriendRequestAction(person.handle)
          if (result.ok && result.state) setState(result.state)
        })
      }}
    >
      {pending ? "Adding…" : "Add friend"}
    </Button>
  )
}

function dedupeMatches(rows: MatchedContact[]) {
  const seen = new Set<string>()
  return rows.filter((row) => {
    const key = `${row.contactKey}:${row.profile.handle}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function uniqueUnmatched(selected: SelectedPhone[], matchedContactKeys: Set<string>) {
  const seen = new Set<string>()
  const rows: UnmatchedContact[] = []
  for (const entry of selected) {
    if (matchedContactKeys.has(entry.contactKey) || seen.has(entry.contactKey)) continue
    seen.add(entry.contactKey)
    rows.push({ contactKey: entry.contactKey, contactName: entry.contactName, phone: entry.phone })
  }
  return rows
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")
}
