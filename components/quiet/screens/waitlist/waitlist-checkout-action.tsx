"use client";

import { useActionState } from "react";
import {
  completeWaitlistCheckout,
  createWaitlistCheckout,
} from "@/app/(consumer)/checkout/waitlist/[waitlistId]/actions";

interface WaitlistCheckoutActionProps {
  waitlistId: string;
  pendingOrderId?: string | null;
  pendingPaymentId?: string | null;
  canProceed: boolean;
  paymentStatus?: {
    status: string;
    provider: string;
    amountCents: number;
    currency: string;
    isSucceeded: boolean;
  } | null;
}

function statusLabel(status: string | null | undefined): string {
  return (status || "pending").replaceAll("_", " ");
}

export function WaitlistCheckoutAction({
  waitlistId,
  pendingOrderId,
  pendingPaymentId,
  canProceed,
  paymentStatus,
}: WaitlistCheckoutActionProps) {
  const [createState, createAction, creating] = useActionState(createWaitlistCheckout, null);
  const [completeState, completeAction, completing] = useActionState(completeWaitlistCheckout, null);

  if (pendingOrderId && pendingPaymentId) {
    const canComplete = paymentStatus?.isSucceeded === true;

    return (
      <div className="space-y-2">
        <div className="rounded-[var(--radius)] border border-accent bg-accent-soft px-3 py-2 font-mono text-[11px] leading-relaxed text-accent">
          Pending waitlist checkout created. Provider: {paymentStatus?.provider ?? "pending"} · Status: {statusLabel(paymentStatus?.status)}
        </div>

        {completeState?.message && (
          <div className="rounded-[var(--radius)] border border-[#f1d0c8] bg-[#fdf0ec] px-3 py-2 font-mono text-[11px] text-[#c1422b]">
            {completeState.message}
          </div>
        )}

        {canComplete ? (
          <form action={completeAction}>
            <input type="hidden" name="waitlistId" value={waitlistId} />
            <input type="hidden" name="paymentId" value={pendingPaymentId} />
            <button
              type="submit"
              disabled={completing}
              className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-accent px-3 text-[12px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {completing ? "Issuing tickets…" : "Complete ticket issue"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            disabled
            className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-surface-2 px-3 text-[12px] font-semibold text-ink-3"
          >
            Awaiting successful payment
          </button>
        )}
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
    <form action={createAction} className="space-y-2">
      <input type="hidden" name="waitlistId" value={waitlistId} />
      {createState?.message && (
        <div className="rounded-[var(--radius)] border border-[#f1d0c8] bg-[#fdf0ec] px-3 py-2 font-mono text-[11px] text-[#c1422b]">
          {createState.message}
        </div>
      )}
      <button
        type="submit"
        disabled={creating}
        className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius)] bg-accent px-3 text-[12px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {creating ? "Creating checkout…" : "Create checkout"}
      </button>
    </form>
  );
}
