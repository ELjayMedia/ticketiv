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
import { PHOTOS } from "@/lib/photos";
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
  suggested?: SuggestedFriend[];
  inviteLink?: string;
  inviteReward?: string;
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

const DEFAULT_PROPS: Required<FriendsScreenProps> = {
  totalFriends: 10,
  pendingRequests: 3,
  goingTogether: {
    eventId: "tribal-tales",
    eventTitle: "Tribal Tales",
    whenLabel: "Wed 30",
    fromPriceMinor: 50000,
    friendPhotos: [PHOTOS.face_1, PHOTOS.face_2, PHOTOS.face_3],
    friendNames: ["Farah", "Salman"],
    totalCount: 3,
  },
  activity: [
    { id: "a1", name: "Farah", photo: PHOTOS.face_2, action: "booked", what: "Indie Showcase", whenAgo: "2h", icon: "ticket" },
    { id: "a2", name: "Salman", photo: PHOTOS.face_3, action: "is going to", what: "Tribal Tales", whenAgo: "5h", icon: "spark" },
    { id: "a3", name: "Vicky", photo: PHOTOS.face_4, action: "rated", what: "Open Mic Friday · ★★★★★", whenAgo: "1d", icon: "heart" },
    { id: "a4", name: "Asha", photo: PHOTOS.face_7, action: "saved", what: "Sunset Set", whenAgo: "1d", icon: "heart" },
    { id: "a5", name: "Amir", photo: PHOTOS.face_5, action: "is following", what: "Comedy Co.", whenAgo: "2d", icon: "plus" },
  ],
  suggested: [
    { id: "s1", name: "Vicky Kausal", photo: PHOTOS.face_4, mutualLabel: "3 mutual" },
    { id: "s2", name: "Rishi K.", photo: PHOTOS.face_6, mutualLabel: "5 mutual" },
    { id: "s3", name: "Priya P.", photo: PHOTOS.face_8, mutualLabel: "1 mutual" },
  ],
  inviteLink: "ticketiv.com/r/smit",
  inviteReward: "get E100 off when 3 join",
};

export function FriendsScreen(props: FriendsScreenProps = {}) {
  const cfg = { ...DEFAULT_PROPS, ...props };
  const [tab, setTab] = React.useState<Tab>("activity");

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
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
        >
          <Icon name="search" size={20} />
        </button>
        <Button variant="accent" size="xs">
          <Icon name="plus" size={14} /> Invite
        </Button>
      </header>

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
              {cfg.activity.map((a) => (
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
              <button className="font-mono text-[11px] font-semibold text-accent">
                see all ›
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {cfg.suggested.map((s) => (
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
                  <Button variant="accent" size="xs" className="w-full">
                    + Add
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
                <Button variant="default" size="xs">
                  <Icon name="copy" size={12} /> Copy
                </Button>
              </div>
            </Card>
          </section>
        </>
      )}

      {tab === "friends" && (
        <div className="mx-5 mt-4 rounded-[var(--radius-lg)] border border-dashed border-line-2 px-6 py-10 text-center">
          <span className="font-mono text-[11px] text-ink-3">
            Full friend list lands in Phase 3 wiring.
          </span>
        </div>
      )}
      {tab === "requests" && (
        <div className="mx-5 mt-4 rounded-[var(--radius-lg)] border border-dashed border-line-2 px-6 py-10 text-center">
          <span className="font-mono text-[11px] text-ink-3">
            {cfg.pendingRequests} pending friend request
            {cfg.pendingRequests === 1 ? "" : "s"}.
          </span>
        </div>
      )}
    </div>
  );
}
