"use client";

import { useActionState } from "react";
import { createWaitlistCheckout } from "@/app/(consumer)/checkout/waitlist/[waitlistId]/actions";

interface WaitlistCheckoutActionProps {
  waitlistId: string;
  pendingOrderId?: string | null;
  pendingPaymentId?: string | null;
  canProceed: boolean;
}

export function WaitlistCheckoutAction({
  waitlistId,
  pendingOrderId,
  pendingPaymentId,
  canProceed,
}: WaitlistCheckoutActionProps) {
  const [state, action, pending] = useActionState(createWaitlistCheckout, null);

  if (pendingOrderId && pendingPaymentId) {
    return (
      <div className="space-y-2">
        <div className="rounded-[var(--radius)] border border-accent bg-accent-soft px-3 py-2 font-mono text-[11px] leading-relaxed text-accent">
          Pending waitlist checkout created. Payment handoff is ready for the next provider integration step.
        </div>
        <button
          type="button"
          disabled
          className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-surface-2 px-3 text-[12px] font-semibold text-ink-3"
        >
          Awaiting payment provider
        </button>
      </div>
    );
  }

  if (!canProceed) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-surface-2 px-3 text-[12px] font-semibold text-ink-3"
      >
        Offer unavailable
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="waitlistId" value={waitlistId} />
      {state?.message && (
        <div className="rounded-[var(--radius)] border border-[#f1d0c8] bg-[#fdf0ec] px-3 py-2 font-mono text-[11px] text-[#c1422b]">
          {state.message}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-accent px-3 text-[12px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creating checkout…" : "Create checkout"}
      </button>
    </form>
  );
}
