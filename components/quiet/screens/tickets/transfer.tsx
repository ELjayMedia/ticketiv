"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestTransfer } from "@/lib/data/attendee/transfers";
import { Icon } from "@/components/quiet/ui/icon";
import { Chip } from "@/components/quiet/ui/chip";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Avatar } from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";
import { formatPrice } from "@/lib/format";

/* ──────────────────────────────────────────────────────────────
 * `/tickets/[id]/transfer` — port of QuietTransfer
 *
 * "Free · No fee" — gift a ticket to a friend. Recipient gets
 * 24h to accept; on accept your QR is revoked and theirs is
 * issued. State here is purely local (selected recipient + note);
 * commit goes through a server action that calls a Supabase RPC.
 * ────────────────────────────────────────────────────────────── */

interface TransferProps {
  ticket?: TicketSummary;
  friends?: FriendOption[];
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

export function Transfer({
  ticket,
  friends = [],
}: TransferProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);
  const [transferError, setTransferError] = React.useState<string | null>(null);

  if (!ticket) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-6">
        <div className="text-center">
          <p className="text-[14px] text-ink-3">Ticket not found.</p>
          <Link href="/app/tickets" className="mt-3 inline-flex items-center gap-1 text-[13px] text-ink-3 underline-offset-4 hover:underline">
            <Icon name="chevL" size={14} /> My tickets
          </Link>
        </div>
      </div>
    );
  }

  const selected = friends.find((f) => f.id === selectedId);

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="h-14" />

        <header className="flex items-center gap-2.5 px-5 pb-3 pt-2">
          <Link
            href={`/tickets/${ticket.id}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
            aria-label="Back"
          >
            <Icon name="chevL" size={22} />
          </Link>
          <div className="flex flex-1 flex-col leading-tight">
            <span className="text-h3 text-[15px]">Transfer ticket</span>
            <span className="font-mono text-[10px] uppercase text-ink-3">
              Free · No fee
            </span>
          </div>
        </header>

        {/* Ticket ribbon */}
        <div className="px-5 pb-4">
          <Card className="flex items-center gap-2.5 p-3" flat>
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[var(--radius)]">
              <Photo src={ticket.eventPhoto} height={44} />
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-[13px] font-semibold">
                {ticket.eventTitle} · {ticket.seatLabel}
              </span>
              <span className="font-mono text-[11px] uppercase text-ink-3">
                {ticket.whenLabel} · {ticket.typeLabel} ·{" "}
                {formatPrice(ticket.priceMinor)}
              </span>
            </div>
          </Card>
        </div>

        {/* Recipient search */}
        <section className="px-5 pb-2">
          <div className="text-label mb-2">Send to</div>
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2.5">
            <Icon name="search" size={16} className="text-ink-3" />
            <input
              type="text"
              placeholder="@handle, name, or phone"
              className="flex-1 bg-transparent text-[14px] font-medium outline-none placeholder:text-ink-3"
            />
          </div>
        </section>

        {/* Friends list */}
        <section className="px-5 pt-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-label">Recent</span>
            <Link
              href="/friends"
              className="font-mono text-[11px] font-semibold text-accent"
            >
              All friends ›
            </Link>
          </div>
          <ul className="flex flex-col">
            {friends.map((f, i) => {
              const active = f.id === selectedId;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(f.id)}
                    className={
                      "flex w-full items-center gap-3 py-2.5 text-left " +
                      (i < friends.length - 1 ? "border-b border-line" : "")
                    }
                  >
                    <Avatar src={f.photo} size={36} />
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-semibold">
                          {f.name}
                        </span>
                        {f.going && (
                          <Chip variant="accent" size="sm">
                            going
                          </Chip>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-ink-3">
                        @{f.handle} · {f.meta}
                      </span>
                    </div>
                    <span
                      className={
                        "inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 shrink-0 " +
                        (active
                          ? "border-accent bg-accent text-white"
                          : "border-line-2 bg-surface")
                      }
                    >
                      {active && <Icon name="check" size={12} strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Note */}
        <section className="px-5 pt-5">
          <div className="text-label mb-2">Add a note (optional)</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-[var(--radius-md)] border border-line bg-surface p-3 text-[14px] outline-none placeholder:text-ink-3 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
            placeholder="Say something nice…"
          />
        </section>

        {/* How it works */}
        <section className="px-5 pt-4">
          <Card className="bg-bg p-3.5" flat>
            <div className="text-label mb-2.5">How it works</div>
            <ol className="flex flex-col gap-2">
              {[
                "Recipient gets a request on Ticketiv",
                "They have 24h to accept",
                "Your QR is revoked, theirs is issued",
              ].map((t, i) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-accent-soft font-mono text-[10px] font-bold text-accent">
                    {i + 1}
                  </span>
                  <span className="text-[12px]">{t}</span>
                </li>
              ))}
            </ol>
          </Card>
        </section>

        <div className="h-24" />
      </div>

      {transferError && (
        <div className="sticky bottom-28 px-5">
          <p className="rounded-[var(--radius)] bg-danger-soft px-3 py-2 text-[12px] text-danger">
            {transferError}
          </p>
        </div>
      )}

      <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-surface px-5 py-3.5 pb-7">
        <Link
          href={`/tickets/${ticket.id}`}
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
              setTransferError("Transfer request failed. Please try again.");
            } else {
              router.push(`/tickets/${ticket.id}`);
            }
          }}
          className="flex flex-[2] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3.5 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? "Sending…"
            : selected
              ? `Send to ${selected.name.split(" ")[0]}`
              : "Pick a recipient"}
          {selected && !isPending && <Icon name="arrowR" size={16} />}
        </button>
      </div>
    </div>
  );
}
