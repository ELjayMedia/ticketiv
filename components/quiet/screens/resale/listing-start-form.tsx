"use client";

import { useMemo, useState, useActionState } from "react";
import Link from "next/link";
import { publishResaleListing } from "@/app/(consumer)/resale/actions";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";

interface ListingStartFormProps {
  ticketId: string;
}

function formatMoney(cents: number, currency = "SZL"): string {
  return new Intl.NumberFormat("en-SZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function ListingStartForm({ ticketId }: ListingStartFormProps) {
  const [state, action, pending] = useActionState(publishResaleListing, null);
  const [price, setPrice] = useState("250");
  const [expiresIn, setExpiresIn] = useState("24");
  const parsedPrice = Number.parseFloat(price || "0");
  const priceCents = Number.isFinite(parsedPrice) ? Math.max(0, Math.round(parsedPrice * 100)) : 0;
  const transferFeeCents = useMemo(() => Math.round(priceCents * 0.05), [priceCents]);
  const estimatedPayoutCents = Math.max(0, priceCents - transferFeeCents);

  return (
    <section className="px-5 pb-4">
      <Card className="border-accent p-4">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="ticket" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold">List this ticket for resale</div>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-3">
              Set a price and expiry. Ticketiv will only publish the listing if this ticket is eligible and belongs to your account.
            </p>
          </div>
        </div>

        <form action={action} className="mt-4 space-y-3">
          <input type="hidden" name="ticketId" value={ticketId} />

          <label className="flex flex-col gap-1">
            <span className="text-label">Listing price</span>
            <div className="flex h-10 overflow-hidden rounded-[var(--radius)] border border-line bg-surface">
              <span className="inline-flex items-center border-r border-line px-3 font-mono text-[12px] text-ink-3">SZL</span>
              <input
                name="price"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                inputMode="decimal"
                className="min-w-0 flex-1 bg-transparent px-3 text-[13px] outline-none"
                placeholder="250"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-label">Listing expiry</span>
            <select
              name="expiresIn"
              value={expiresIn}
              onChange={(event) => setExpiresIn(event.target.value)}
              className="h-10 rounded-[var(--radius)] border border-line bg-surface px-3 text-[13px] outline-none focus:border-accent"
            >
              <option value="6">6 hours</option>
              <option value="12">12 hours</option>
              <option value="24">24 hours</option>
              <option value="48">48 hours</option>
            </select>
          </label>

          <div className="rounded-[var(--radius)] border border-line p-3">
            <div className="text-label mb-2">Review</div>
            <div className="space-y-1.5 font-mono text-[11px] text-ink-3">
              <div className="flex justify-between gap-3">
                <span>Buyer pays</span>
                <span className="font-semibold text-ink">{formatMoney(priceCents)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Estimated transfer fee</span>
                <span>{formatMoney(transferFeeCents)}</span>
              </div>
              <div className="flex justify-between gap-3 border-t border-line pt-1.5">
                <span>Estimated payout</span>
                <span className="font-semibold text-accent">{formatMoney(estimatedPayoutCents)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius)] border border-line bg-bg px-3 py-2 font-mono text-[11px] leading-relaxed text-ink-3">
            Eligible tickets must be issued, unused, not refunded, not revoked, not checked in, and not already listed.
          </div>

          {state?.message && (
            <div className="rounded-[var(--radius)] border border-[#f1d0c8] bg-[#fdf0ec] px-3 py-2 font-mono text-[11px] text-[#c1422b]">
              {state.message}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/tickets/${encodeURIComponent(ticketId)}`}
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 text-[12px] font-semibold hover:bg-bg"
            >
              View ticket
            </Link>
            <button
              type="submit"
              disabled={pending || priceCents <= 0}
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-accent px-3 text-[12px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Publishing…" : "Publish listing"}
            </button>
          </div>
        </form>
      </Card>
    </section>
  );
}
