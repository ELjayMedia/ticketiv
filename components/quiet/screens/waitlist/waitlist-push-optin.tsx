"use client";

// TICK-214: contextual push opt-in for the waitlist join flow.
//
// Renders a "Notify me on this device" affordance. Permission is requested only
// when the buyer taps the button (contextual — never on page load), satisfying
// the AC. On success the browser Push subscription is captured and persisted via
// the storePushSubscription server action (SECURITY DEFINER RPC).
//
// When the browser lacks Push support, or no VAPID key is configured yet, the
// control degrades gracefully to an informational note (in-app notifications
// still cover the buyer) rather than failing.

import { useEffect, useState } from "react";
import { Icon } from "@/components/quiet/ui/icon";
import { Button } from "@/components/quiet/ui/button";
import {
  enableWaitlistPush,
  isPushConfigured,
  isPushSupported,
  type PushOptInResult,
} from "@/lib/push/client";
import { storePushSubscription } from "@/app/(consumer)/waitlist/push-actions";

type Status = "idle" | "working" | "enabled" | "error";

export function WaitlistPushOptIn() {
  const [supported, setSupported] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSupported(isPushSupported());
    setConfigured(isPushConfigured());
  }, []);

  async function handleEnable() {
    setStatus("working");
    setMessage(null);

    const result: PushOptInResult = await enableWaitlistPush(storePushSubscription);

    if (result.ok) {
      setStatus("enabled");
      setMessage("You'll get a push when a ticket opens up.");
      return;
    }

    setStatus("error");
    setMessage(result.message);
  }

  if (!supported) {
    return (
      <p className="mt-3 font-mono text-[11px] leading-relaxed text-ink-4">
        Push notifications aren&apos;t supported on this device — we&apos;ll still alert you in the app.
      </p>
    );
  }

  if (status === "enabled") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-[var(--radius)] border border-line bg-accent-soft px-3 py-2 text-accent">
        <Icon name="bell" size={16} />
        <span className="text-[12px] font-semibold">{message}</span>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        block
        onClick={handleEnable}
        disabled={status === "working"}
      >
        <Icon name="bell" size={16} />
        {status === "working" ? "Enabling…" : "Notify me on this device"}
      </Button>
      <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-ink-4">
        {status === "error" && message
          ? message
          : !configured
            ? "Browser push is coming soon — for now we'll notify you in the app and by email."
            : "Get a browser alert the moment a ticket becomes available."}
      </p>
    </div>
  );
}
