"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  lookupTransferRecipient,
  requestTransfer,
  type TransferRecipientLookup,
} from "@/lib/data/attendee/transfers";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Avatar } from "@/components/quiet/ui/primitives";
import { formatPrice } from "@/lib/format";
import posthog from "posthog-js";

interface TransferProps {
  ticket?: TicketSummary;
  friends?: FriendOption[];
  returnTo?: string | null;
}

interface TicketSummary {
  id: string;
  eventTitle: string;
  eventPhoto: string;
  seatLabel: string;
  whenLabel: string;
  typeLabel: string;
  priceMinor: number;
}

interface FriendOption {
  id: string;
  name: string;
  handle: string;
  photo: string;
  meta: string;
  going?: boolean;
}

type ManualRecipient = TransferRecipientLookup & {
  id: string;
  name: string;
  meta: string;
};

export function Transfer({ ticket, friends = [], returnTo = null }: TransferProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [manualRecipient, setManualRecipient] = React.useState<ManualRecipient | null>(null);
  const [lookupState, setLookupState] = React.useState<"idle" | "searching" | "not_found">("idle");
  const [isPending, setIsPending] = React.useState(false);
  const [transferError, setTransferError] = React.useState<string | null>(null);

  if (!ticket) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
        <div className="text-center">
          <p className="text-[14px] text-ink-3">Ticket not found.</p>
          <Link href="/tickets" className="mt-3 inline-flex items-center gap-1 text-[13px] text-ink-3 underline-offset-4 hover:underline">
            <Icon name="chevL" size={14} /> My tickets
          </Link>
        </div>
      </div>
    );
  }

  const backHref = returnTo ?? `/tickets/${ticket.id}`;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleFriends = normalizedQuery
    ? friends.filter((friend) =>
        friend.name.toLowerCase().includes(normalizedQuery) ||
        friend.handle.toLowerCase().includes(normalizedQuery.replace(/^@/, "")),
      )
    : friends;

  const selectedFriend = friends.find((friend) => friend.id === selectedId);
  const selected = selectedFriend ?? (manualRecipient?.id === selectedId ? manualRecipient : undefined);

  const resetSearchSelection = (value: string) => {
    setQuery(value);
    setSelectedId(null);
    setManualRecipient(null);
    setLookupState("idle");
    setTransferError(null);
  };

  const resolveManualRecipient = async () => {
    const identifier = query.trim();
    if (identifier.length < 3 || lookupState === "searching") return;

    setLookupState("searching");
    setTransferError(null);
    const result = await lookupTransferRecipient(identifier);

    if (!result) {
      setManualRecipient(null);
      setSelectedId(null);
      setLookupState("not_found");
      return;
    }

    const resolved: ManualRecipient = {
      ...result,
      id: result.userId,
      name: result.displayName,
      meta: result.matchKind === "handle" ? "Ticketiv profile" : `Matched by ${result.matchKind}`,
    };
    setManualRecipient(resolved);
    setSelectedId(resolved.id);
    setLookupState("idle");
  };

  const shareSignupInvite = async () => {
    const url = `${window.location.origin}/signup`;
    if (navigator.share) {
      await navigator.share({
        title: "Join me on Ticketiv",
        text: "Create a Ticketiv account so I can send you a ticket.",
        url,
      });
      return;
    }
    await navigator.clipboard?.writeText(url);
  };

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="h-14" />

        <header className="flex items-center gap-2.5 px-5 pb-3 pt-2">
          <Link
            href={backHref}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
            aria-label="Back"
          >
            <Icon name="chevL" size={22} />
          </Link>
          <div className="flex flex-1 flex-col leading-tight">
            <span className="text-h3 text-[15px]">Transfer ticket</span>
            <span className="font-mono text-[10px] uppercase text-ink-3">Free · No fee</span>
          </div>
        </header>

        <div className="px-5 pb-4">
          <Card className="flex items-center gap-2.5 p-3" flat>
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[var(--radius)]">
              <Photo src={ticket.eventPhoto} height={44} />
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-[13px] font-semibold">{ticket.eventTitle} · {ticket.seatLabel}</span>
              <span className="font-mono text-[11px] uppercase text-ink-3">
                {ticket.whenLabel} · {ticket.typeLabel} · {formatPrice(ticket.priceMinor)}
              </span>
            </div>
          </Card>
        </div>

        <section className="px-5 pb-2">
          <div className="text-label mb-2">Send to</div>
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2.5 focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent-soft">
            <Icon name="search" size={16} className="text-ink-3" />
            <input
              value={query}
              onChange={(event) => resetSearchSelection(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void resolveManualRecipient();
                }
              }}
              type="text"
              placeholder="Friend, @handle, email, or phone"
              className="flex-1 bg-transparent text-[14px] font-medium outline-none placeholder:text-ink-3"
            />
          </div>

          {query.trim().length >= 3 && (
            <button
              type="button"
              disabled={lookupState === "searching"}
              onClick={() => void resolveManualRecipient()}
              className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-accent disabled:opacity-50"
            >
              <Icon name="search" size={12} />
              {lookupState === "searching" ? "Checking Ticketiv…" : "Find exact Ticketiv account"}
            </button>
          )}

          {manualRecipient && (
            <div className="mt-3 flex items-center gap-3 rounded-[var(--radius-md)] border border-accent bg-accent-soft p-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-white">
                {manualRecipient.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{manualRecipient.name}</div>
                <div className="font-mono text-[11px] text-ink-3">
                  {manualRecipient.handle ? `@${manualRecipient.handle} · ` : ""}{manualRecipient.meta}
                </div>
              </div>
              <Icon name="check" size={16} className="text-accent" strokeWidth={2.5} />
            </div>
          )}

          {lookupState === "not_found" && (
            <div className="mt-3 rounded-[var(--radius-md)] border border-line bg-surface p-3">
              <div className="text-[13px] font-semibold">No Ticketiv account found</div>
              <p className="mt-1 text-[12px] leading-5 text-ink-3">
                The ticket stays with you until they have an account. Invite them first, then return here to transfer it.
              </p>
              <button
                type="button"
                onClick={() => void shareSignupInvite()}
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent"
              >
                <Icon name="share" size={13} /> Invite to Ticketiv
              </button>
            </div>
          )}
        </section>

        <section className="px-5 pt-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-label">Friends</span>
            <Link href="/friends" className="font-mono text-[11px] font-semibold text-accent">All friends ›</Link>
          </div>

          {visibleFriends.length === 0 ? (
            <p className="py-4 text-[12px] text-ink-3">
              {friends.length === 0 ? "Add friends to make ticket transfers quicker." : "No friends match this search."}
            </p>
          ) : (
            <ul className="flex flex-col">
              {visibleFriends.map((friend, index) => {
                const active = friend.id === selectedId;
                return (
                  <li key={friend.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(friend.id);
                        setManualRecipient(null);
                        setLookupState("idle");
                      }}
                      className={
                        "flex w-full items-center gap-3 py-2.5 text-left " +
                        (index < visibleFriends.length - 1 ? "border-b border-line" : "")
                      }
                    >
                      <Avatar src={friend.photo} size={36} />
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14px] font-semibold">{friend.name}</span>
                          {friend.going && <Chip variant="accent" size="sm">going</Chip>}
                        </div>
                        <span className="font-mono text-[11px] text-ink-3">@{friend.handle} · {friend.meta}</span>
                      </div>
                      <span
                        className={
                          "inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 " +
                          (active ? "border-accent bg-accent text-white" : "border-line-2 bg-surface")
                        }
                      >
                        {active && <Icon name="check" size={12} strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="px-5 pt-5">
          <Card className="bg-bg p-3.5" flat>
            <div className="text-label mb-2.5">How it works</div>
            <ol className="flex flex-col gap-2">
              {[
                "Recipient gets a transfer request on Ticketiv",
                "They have 24 hours to accept",
                "After acceptance, this individual ticket moves to their account",
              ].map((text, index) => (
                <li key={text} className="flex items-center gap-2.5">
                  <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent-soft font-mono text-[10px] font-bold text-accent">
                    {index + 1}
                  </span>
                  <span className="text-[12px]">{text}</span>
                </li>
              ))}
            </ol>
          </Card>
        </section>

        <div className="h-24" />
      </div>

      {transferError && (
        <div className="sticky bottom-28 px-5">
          <p className="rounded-[var(--radius)] bg-danger-soft px-3 py-2 text-[12px] text-danger">{transferError}</p>
        </div>
      )}

      <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-surface px-5 py-3.5 pb-7">
        <Link
          href={backHref}
          className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] border border-line-2 bg-surface px-4 py-3.5 text-[14px] font-semibold hover:bg-bg"
        >
          Cancel
        </Link>
        <button
          disabled={!selected || isPending}
          onClick={async () => {
            if (!selected || isPending) return;
            setIsPending(true);
            setTransferError(null);
            const result = await requestTransfer(ticket.id, selected.id);
            setIsPending(false);
            if (!result) {
              setTransferError("Transfer request failed. The ticket may no longer be eligible or another request may already be pending.");
              return;
            }
            posthog.capture("ticket_transfer_requested", {
              ticket_id: ticket.id,
              recipient_kind: manualRecipient ? manualRecipient.matchKind : "friend",
            });
            router.push(returnTo ?? "/transfers");
          }}
          className="flex flex-[2] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3.5 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Sending…" : selected ? `Send to ${selected.name.split(" ")[0]}` : "Pick a recipient"}
          {selected && !isPending && <Icon name="arrowR" size={16} />}
        </button>
      </div>
    </div>
  );
}
