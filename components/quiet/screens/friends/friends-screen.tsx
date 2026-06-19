"use client";

import * as React from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import {
  Photo,
  Avatar,
  AvatarStack,
  Segmented,
} from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";
import { formatPrice } from "@/lib/format";

/* ──────────────────────────────────────────────────────────────
 * /friends · port of QuietFriends
 *
 * Activity feed driving discovery — "Farah, Salman + 1 going to
 * Tribal Tales" is the canonical example. The card is interactive:
 * "Join them — book E500" deep-links straight to the event's
 * checkout. This is the social hook for the platform.
 *
 * Three segments: Activity, Friends list, Requests.
 * ────────────────────────────────────────────────────────────── */

type Tab = "activity" | "friends" | "requests";

interface FriendsScreenProps {
  totalFriends?: number;
  pendingRequests?: number;
  goingTogether?: GoingTogether | null;
  activity?: ActivityItem[];
  friends?: FriendRow[];
  suggested?: SuggestedFriend[];
  inviteLink?: string;
  inviteReward?: string;
  requests?: { id: string; name: string; photo: string; mutualLabel: string }[];
}

interface FriendRow {
  id: string;
  name: string;
  photo: string;
  handle: string | null;
  mutualLabel: string;
}

interface GoingTogether {
  eventId: string;
  eventTitle: string;
  whenLabel: string;
  fromPriceMinor: number;
  friendPhotos: string[];
  friendNames: string[]; // ["Farah", "Salman"]
  totalCount: number;
}

interface ActivityItem {
  id: string;
  name: string;
  photo: string;
  action: string;
  what: string;
  whenAgo: string;
  icon: IconName;
}

interface SuggestedFriend {
  id: string;
  name: string;
  photo: string;
  mutualLabel: string;
}

export function FriendsScreen({
  totalFriends = 0,
  pendingRequests = 0,
  goingTogether = null,
  activity = [],
  friends = [],
  suggested = [],
  inviteLink = "",
  inviteReward = "",
  requests = [],
}: FriendsScreenProps = {}) {
  const cfg = { totalFriends, pendingRequests, goingTogether, activity, friends, suggested, inviteLink, inviteReward };
  const [tab, setTab] = React.useState<Tab>("activity");
  const [copied, setCopied] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [addedFriends, setAddedFriends] = React.useState<Set<string>>(new Set());
  const [showAllSuggested, setShowAllSuggested] = React.useState(false);
  const [acceptedRequests, setAcceptedRequests] = React.useState<Set<string>>(new Set());
  const [declinedRequests, setDeclinedRequests] = React.useState<Set<string>>(new Set());

  function toggleAdd(id: string) {
    setAddedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const displayedSuggested = showAllSuggested ? cfg.suggested : cfg.suggested.slice(0, 3);

  const filteredActivity = searchQuery.trim()
    ? cfg.activity.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.what.toLowerCase().includes(searchQuery.toLowerCase()))
    : cfg.activity;

  function handleCopyInviteLink() {
    const url = cfg.inviteLink.startsWith("http") ? cfg.inviteLink : `https://${cfg.inviteLink}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        window.prompt("Copy your invite link:", url);
      });
    } else {
      window.prompt("Copy your invite link:", url);
    }
  }

  return (
    <div className="bg-bg pb-24">
      <div className="h-14" />

      {/* Header */}
      <header className="flex items-end gap-2.5 px-5 pb-3 pt-2">
        <div className="flex flex-1 flex-col">
          <span className="text-label">Your circle</span>
          <span className="text-h1 mt-0.5">
            Friends · {cfg.totalFriends}
          </span>
        </div>
        <button
          aria-label="Search friends"
          onClick={() => { setSearchOpen((v) => !v); setSearchQuery(""); }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
        >
          <Icon name="search" size={20} />
        </button>
        <Button variant="accent" size="xs" onClick={handleCopyInviteLink}>
          <Icon name="plus" size={14} /> Invite
        </Button>
      </header>

      {searchOpen && (
        <div className="px-5 pb-2">
          <div className="flex items-center gap-2 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2">
            <Icon name="search" size={14} className="text-ink-3 shrink-0" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends and activity…"
              className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-ink-3 hover:text-ink">
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Segmented */}
      <div className="px-5 pb-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "activity", label: "Activity" },
            { value: "friends", label: "Friends" },
            {
              value: "requests",
              label: `Requests · ${cfg.pendingRequests}`,
            },
          ]}
        />
      </div>

      {tab === "activity" && (
        <>
          {/* Going together hero */}
          {cfg.goingTogether && (
            <section className="px-5 pb-4">
              <Card className="border-accent bg-accent-soft p-3.5">
                <div className="flex items-center gap-2.5">
                  <AvatarStack>
                    {cfg.goingTogether.friendPhotos.map((p, i) => (
                      <Avatar
                        key={i}
                        src={p}
                        size={28}
                        className="ring-accent-soft"
                      />
                    ))}
                  </AvatarStack>
                  <div className="flex flex-1 flex-col">
                    <span className="text-[13px] font-semibold">
                      {cfg.goingTogether.friendNames.join(", ")}
                      {cfg.goingTogether.totalCount >
                        cfg.goingTogether.friendNames.length &&
                        ` + ${
                          cfg.goingTogether.totalCount -
                          cfg.goingTogether.friendNames.length
                        }`}{" "}
                      going to
                    </span>
                    <Link
                      href={`/events/${cfg.goingTogether.eventId}`}
                      className="text-[13px] font-semibold text-accent"
                    >
                      {cfg.goingTogether.eventTitle} ·{" "}
                      {cfg.goingTogether.whenLabel}
                    </Link>
                  </div>
                </div>
                <Link
                  href={`/events/${cfg.goingTogether.eventId}/checkout`}
                  className="mt-3 flex w-full items-center justify-center rounded-[var(--radius)] bg-accent px-3 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
                >
                  Join them — book {formatPrice(cfg.goingTogether.fromPriceMinor)}
                </Link>
              </Card>
            </section>
          )}

          {/* Activity feed */}
          <section className="px-5 pb-4">
            <div className="text-label mb-2">Recent</div>
            <ul className="flex flex-col gap-2">
              {filteredActivity.map((a) => (
                <li key={a.id} className="flex items-center gap-2.5 py-1">
                  <div className="relative">
                    <Avatar src={a.photo} size={36} />
                    <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-surface bg-accent-soft text-accent">
                      <Icon name={a.icon} size={9} />
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <p className="text-[13px]">
                      <span className="font-semibold">{a.name}</span>{" "}
                      <span className="text-ink-3">{a.action}</span>{" "}
                      <span className="font-semibold">{a.what}</span>
                    </p>
                    <span className="font-mono text-[10px] text-ink-3">
                      {a.whenAgo} ago
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Suggested */}
          <section className="px-5 pb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-label">People you may know</span>
              <button
                onClick={() => setShowAllSuggested((v) => !v)}
                className="font-mono text-[11px] font-semibold text-accent"
              >
                {showAllSuggested ? "see less" : "see all ›"}
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {displayedSuggested.map((s) => (
                <Card
                  key={s.id}
                  className="w-[140px] shrink-0 flex flex-col items-center gap-1.5 p-3"
                >
                  <Avatar src={s.photo} size={48} />
                  <span className="text-center text-[12px] font-semibold">
                    {s.name}
                  </span>
                  <span className="font-mono text-[10px] text-ink-3">
                    {s.mutualLabel}
                  </span>
                  <Button
                    variant={addedFriends.has(s.id) ? "default" : "accent"}
                    size="xs"
                    className="w-full"
                    onClick={() => toggleAdd(s.id)}
                  >
                    {addedFriends.has(s.id) ? "Requested" : "+ Add"}
                  </Button>
                </Card>
              ))}
            </div>
          </section>

          {/* Invite via link */}
          <section className="px-5 pb-4">
            <Card className="p-3.5">
              <div className="mb-2.5 flex items-center gap-2.5">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon name="share" size={16} />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-[13px] font-semibold">
                    Invite friends
                  </span>
                  <span className="font-mono text-[11px] text-ink-3">
                    {cfg.inviteReward}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-[var(--radius)] bg-bg px-3 py-2.5">
                <span className="flex-1 font-mono text-[12px]">
                  {cfg.inviteLink}
                </span>
                <Button variant="default" size="xs" onClick={handleCopyInviteLink}>
                  <Icon name="copy" size={12} /> {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </Card>
          </section>
        </>
      )}

      {tab === "friends" && (
        <FriendsListTab friends={cfg.friends} searchQuery={searchQuery} />
      )}
      {tab === "requests" && (
        <section className="px-5 pt-1">
          {cfg.pendingRequests === 0 ? (
            <div className="mt-4 rounded-[var(--radius-lg)] border border-dashed border-line-2 px-6 py-10 text-center">
              <span className="font-mono text-[11px] text-ink-3">No pending friend requests.</span>
            </div>
          ) : (
            <>
              <div className="text-label mb-2">
                {cfg.pendingRequests} pending request{cfg.pendingRequests === 1 ? "" : "s"}
              </div>
              <ul className="flex flex-col gap-2">
                {requests.slice(0, cfg.pendingRequests).map((r) => {
                  const accepted = acceptedRequests.has(r.id);
                  const declined = declinedRequests.has(r.id);
                  if (declined) return null;
                  return (
                    <li key={r.id}>
                      <Card className="flex items-center gap-3 p-3.5">
                        <Avatar src={r.photo} size={40} />
                        <div className="flex flex-1 flex-col">
                          <span className="text-[13px] font-semibold">{r.name}</span>
                          <span className="font-mono text-[10px] text-ink-3">{r.mutualLabel}</span>
                        </div>
                        {accepted ? (
                          <span className="font-mono text-[11px] font-semibold text-accent">Friends ✓</span>
                        ) : (
                          <div className="flex gap-1.5">
                            <Button
                              variant="default"
                              size="xs"
                              onClick={() => setDeclinedRequests((prev) => new Set([...prev, r.id]))}
                            >
                              Decline
                            </Button>
                            <Button
                              variant="accent"
                              size="xs"
                              onClick={() => setAcceptedRequests((prev) => new Set([...prev, r.id]))}
                            >
                              Accept
                            </Button>
                          </div>
                        )}
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function FriendsListTab({
  friends,
  searchQuery,
}: {
  friends: FriendRow[];
  searchQuery: string;
}) {
  const q = searchQuery.trim().toLowerCase();
  const visible = q
    ? friends.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.handle?.toLowerCase().includes(q) ?? false),
      )
    : friends;

  if (friends.length === 0) {
    return (
      <div className="mx-5 mt-4 rounded-[var(--radius-lg)] border border-dashed border-line-2 px-6 py-10 text-center">
        <span className="font-mono text-[11px] text-ink-3">
          No friends yet — invite someone!
        </span>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="mx-5 mt-4 rounded-[var(--radius-lg)] border border-dashed border-line-2 px-6 py-10 text-center">
        <span className="font-mono text-[11px] text-ink-3">No friends match your search.</span>
      </div>
    );
  }

  return (
    <section className="px-5 pt-1">
      <div className="text-label mb-2">{friends.length} friend{friends.length === 1 ? "" : "s"}</div>
      <ul className="flex flex-col gap-2">
        {visible.map((f) => (
          <li key={f.id}>
            <Card className="flex items-center gap-3 p-3" flat>
              <Avatar src={f.photo} size={40} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-semibold">{f.name}</span>
                <span className="truncate font-mono text-[11px] text-ink-3">
                  {f.handle ? `@${f.handle} · ` : ""}{f.mutualLabel}
                </span>
              </div>
              {f.handle && (
                <Link
                  href={`/u/${f.handle}`}
                  className="inline-flex items-center gap-1 rounded-[var(--radius)] border border-line-2 px-2.5 py-1 text-[12px] font-semibold hover:bg-bg"
                >
                  View
                </Link>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
