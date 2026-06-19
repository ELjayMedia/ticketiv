"use client";

import * as React from "react";
import Link from "next/link";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { Photo, Divider } from "@/components/quiet/ui/primitives";
import { formatPrice } from "@/lib/format";

/* ──────────────────────────────────────────────────────────────
 * `/tickets/[id]/resale` — port of QuietResale
 *
 * The list-your-ticket flow. Key constraints encoded in the design:
 *   - Asking price cap = 110% of face (anti-scalping rule)
 *   - Platform fee = 8% of asking price
 *   - Payout credited 24h after the event
 *   - On sale: your QR auto-revokes, buyer gets fresh QR
 *
 * Slider state is local; commit goes through a server action that
 * writes to Supabase `resale_listings`.
 * ────────────────────────────────────────────────────────────── */

interface ResaleProps {
  ticket?: ResaleTicket;
  /** Platform fee as a fraction (e.g. 0.08 for 8%) */
  feeRate?: number;
  /** Resale price cap as a fraction of face (e.g. 1.1 for 110%) */
  capRate?: number;
}

interface ResaleTicket {
  id: string;
  eventTitle: string;
  eventPhoto: string;
  seatLabel: string;
  whenLabel: string;
  typeLabel: string;
  /** What the seller paid */
  paidMinor: number;
  /** Face value — what new buyers see on the event page */
  faceMinor: number;
}

export function Resale({
  ticket,
  feeRate = 0.08,
  capRate = 1.1,
}: ResaleProps) {
  const [askMinor, setAskMinor] = React.useState(0);

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

  const capMinor = Math.round(ticket.faceMinor * capRate);
  const feeMinor = Math.round(askMinor * feeRate);
  const payoutMinor = askMinor - feeMinor;

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
            <span className="text-label">Resell</span>
            <span className="text-[15px] font-semibold">List your ticket</span>
          </div>
          <span className="rounded bg-[#f3f1ee] px-2 py-0.5 font-mono text-[10px] uppercase text-ink-3">
            Safe transfer
          </span>
        </header>

        {/* Ticket */}
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
                {ticket.whenLabel} · {ticket.typeLabel} · PAID{" "}
                {formatPrice(ticket.paidMinor)}
              </span>
            </div>
          </Card>
        </div>

        {/* Price input */}
        <section className="px-5 pb-4">
          <div className="text-label mb-2">Your asking price</div>
          <Card className="p-3.5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[24px] font-semibold text-ink-3">
                E
              </span>
              <span className="font-mono text-[36px] font-semibold tracking-[-0.02em]">
                {Math.round(askMinor / 100).toLocaleString()}
              </span>
            </div>

            {/* Slider */}
            <div className="mt-4">
              <input
                type="range"
                min={0}
                max={capMinor}
                step={500}
                value={askMinor}
                onChange={(e) => setAskMinor(Number(e.target.value))}
                className="w-full accent-accent"
                aria-label="Asking price"
              />
              <div className="mt-1 flex items-center font-mono text-[10px] text-ink-3">
                <span>{formatPrice(0)}</span>
                <span className="flex-1" />
                <span>{formatPrice(ticket.faceMinor)} face</span>
                <span className="flex-1" />
                <span>cap {formatPrice(capMinor)}</span>
              </div>
            </div>
          </Card>
        </section>

        {/* Breakdown */}
        <section className="px-5 pb-4">
          <Card className="bg-bg p-3.5" flat>
            <Row label="Buyer pays" value={formatPrice(askMinor)} />
            <Row
              label={`Platform fee (${Math.round(feeRate * 100)}%)`}
              value={`−${formatPrice(feeMinor)}`}
              muted
            />
            <Divider className="my-2" />
            <div className="flex items-center">
              <span className="flex-1 text-[14px] font-semibold">
                You receive
              </span>
              <span className="font-mono text-[18px] font-semibold text-accent">
                {formatPrice(payoutMinor)}
              </span>
            </div>
            <div className="mt-1 font-mono text-[10px] text-ink-3">
              credited 24h after event
            </div>
          </Card>
        </section>

        {/* How it works */}
        <section className="px-5 pb-4">
          <Card className="p-3.5">
            <div className="text-label mb-2.5">When it sells</div>
            <ol className="flex flex-col gap-2.5">
              {[
                "Your QR is auto-revoked",
                "Buyer gets a fresh QR",
                "Funds appear in your wallet",
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

        {/* Caps notice */}
        <section className="px-5 pb-3.5">
          <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[#fde2c1] bg-[#fdf6ed] p-3">
            <Icon name="zap" size={16} className="mt-0.5 text-[#c1841c]" />
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[12px] font-semibold">
                Resale cap on this event
              </span>
              <span className="font-mono text-[11px] text-[#7a5210]">
                up to {Math.round(capRate * 100)}% of face · max{" "}
                {formatPrice(capMinor)}
              </span>
            </div>
          </div>
        </section>

        <div className="h-24" />
      </div>

      <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-surface px-5 py-3.5 pb-7">
        <Link
          href={`/tickets/${ticket.id}`}
          className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] border border-line-2 bg-surface px-4 py-3.5 text-[14px] font-semibold hover:bg-bg"
        >
          Cancel
        </Link>
        <button
          disabled={askMinor <= 0 || askMinor > capMinor}
          className="flex flex-[2] items-center justify-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 py-3.5 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          List for {formatPrice(askMinor)} <Icon name="arrowR" size={16} />
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center py-0.5">
      <span className="flex-1 font-mono text-[12px] text-ink-3">{label}</span>
      <span
        className={
          "font-mono text-[12px] " + (muted ? "text-ink-3" : "text-ink")
        }
      >
        {value}
      </span>
    </div>
  );
}
