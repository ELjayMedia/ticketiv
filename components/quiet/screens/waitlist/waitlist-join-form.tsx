"use client";

import { useActionState } from "react";
import { Icon } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";
import { joinWaitlist } from "@/app/(consumer)/waitlist/actions";
import { WaitlistPushOptIn } from "@/components/quiet/screens/waitlist/waitlist-push-optin";

interface WaitlistJoinFormProps {
  eventId: string;
  ticketTypeId?: string | null;
}

export function WaitlistJoinForm({ eventId, ticketTypeId }: WaitlistJoinFormProps) {
  const [state, formAction, pending] = useActionState(joinWaitlist, null);

  return (
    <section className="px-5 pb-4">
      <Card className="border-accent p-4">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="clock" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold">Join this waitlist</div>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-ink-3">
              Add your details and we’ll track your request. If tickets become available, the offer will appear here and in notifications.
            </p>
          </div>
        </div>

        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="eventId" value={eventId} />
          {ticketTypeId && <input type="hidden" name="ticketTypeId" value={ticketTypeId} />}

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-label">First name</span>
              <input
                name="firstName"
                className="h-10 rounded-[var(--radius)] border border-line bg-surface px-3 text-[13px] outline-none focus:border-accent"
                autoComplete="given-name"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label">Last name</span>
              <input
                name="lastName"
                className="h-10 rounded-[var(--radius)] border border-line bg-surface px-3 text-[13px] outline-none focus:border-accent"
                autoComplete="family-name"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-label">Email</span>
            <input
              name="email"
              type="email"
              className="h-10 rounded-[var(--radius)] border border-line bg-surface px-3 text-[13px] outline-none focus:border-accent"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-label">Tickets requested</span>
            <select
              name="quantityRequested"
              defaultValue="1"
              className="h-10 rounded-[var(--radius)] border border-line bg-surface px-3 text-[13px] outline-none focus:border-accent"
            >
              {[1, 2, 3, 4, 5, 6].map((quantity) => (
                <option key={quantity} value={quantity}>
                  {quantity}
                </option>
              ))}
            </select>
          </label>

          {state?.message && (
            <div className="rounded-[var(--radius)] border border-[#f1d0c8] bg-[#fdf0ec] px-3 py-2 font-mono text-[11px] text-[#c1422b]">
              {state.message}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-accent px-3 text-[13px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Joining…" : "Join waitlist"}
          </button>
        </form>

        {/* TICK-214: contextual push opt-in. Permission requested only on tap. */}
        <WaitlistPushOptIn />
      </Card>
    </section>
  );
}
